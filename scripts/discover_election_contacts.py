#!/usr/bin/env python3
"""Discover election-notice contact evidence from MFA-linked mission sites.

This command is deliberately a discovery stage only: it reads public pages and
writes review candidates.  It never infers an address and never changes the
recipient override file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
import time
import unicodedata
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from bs4 import BeautifulSoup


INDEX_URLS = (
    "https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/ambasade",
    "https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/konzulati",
    "https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/drzave-pokrivene-na-nerezidencijalnoj-osnovi",
)
MFA_HOSTS = frozenset({"mfa.gov.rs", "www.mfa.gov.rs"})
OVERRIDES_PATH = Path("data/overrides.json").resolve()


EMAIL_RE = re.compile(
    r"(?<![\w.+%-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}(?![\w-]|\.[\w-])",
    re.IGNORECASE,
)
ELECTION_RE = re.compile(
    r"\b(?:izbor\w*|glasanj\w*|birac\w*|election\w*|vot(?:e|ing)\w*|electoral\w*)\b",
    re.IGNORECASE,
)
ACTIVITY_RE = re.compile(
    r"(?:aktuelnost\w*|vesti?|obavestenj\w*|news|activit\w*|announcement\w*|saopstenj\w*|izbor\w*|glasanj\w*|birac\w*|election\w*|vot(?:e|ing)\w*)",
    re.IGNORECASE,
)
FORM_URL_RE = re.compile(r"(?:^|[/_.-])(?:form|formular|obrazac)(?:[/_.-]|$)", re.IGNORECASE)
YEAR_RE = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")
YEAR_VALUE_RE = re.compile(r"(?:19|20)\d{2}")

CYRILLIC_TO_LATIN = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "dj", "е": "e", "ж": "z", "з": "z", "и": "i", "ј": "j", "к": "k", "л": "l", "љ": "lj", "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "ћ": "c", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "c", "џ": "dz", "ш": "s",
    "А": "a", "Б": "b", "В": "v", "Г": "g", "Д": "d", "Ђ": "dj", "Е": "e", "Ж": "z", "З": "z", "И": "i", "Ј": "j", "К": "k", "Л": "l", "Љ": "lj", "М": "m", "Н": "n", "Њ": "nj", "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "Ћ": "c", "У": "u", "Ф": "f", "Х": "h", "Ц": "c", "Ч": "c", "Џ": "dz", "Ш": "s",
})


@dataclass(frozen=True)
class Station:
    country_code: str
    station_id: str
    website_host: str
    email: str = ""

@dataclass(frozen=True)
class PageTask:
    url: str
    country_code: str
    stations: tuple[Station, ...]
    depth: int
    title_hint: str = ""


@dataclass(frozen=True)
class Response:
    url: str
    content_type: str
    body: bytes

@dataclass(frozen=True)
class ElectionEvidence:
    email: str
    quote: str
    context: str


EVIDENCE_BLOCK_SELECTOR = "article, main, [role='main'], section, p, li, td, blockquote"
CONTEXTUAL_CONTAINER_TAGS = frozenset({"article", "section", "li", "td", "blockquote"})
GROUPED_NOTICE_CONTAINER_TAGS = CONTEXTUAL_CONTAINER_TAGS | frozenset({"div"})

class RestrictedRedirectHandler(HTTPRedirectHandler):
    """Permit HTTPS redirects only to a pre-approved official host."""

    def __init__(self, allowed_hosts: frozenset[str]):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        target = absolute_https_url(urljoin(req.full_url, newurl))
        if target is None or url_host(target) not in self.allowed_hosts:
            return None
        return super().redirect_request(req, fp, code, msg, headers, target)


def searchable_text(value: str) -> str:
    transliterated = value.translate(CYRILLIC_TO_LATIN).casefold()
    decomposed = unicodedata.normalize("NFKD", transliterated)
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def normalized_name(value: str) -> str:
    return "".join(char for char in searchable_text(value) if char.isalnum())


def absolute_https_url(value: str) -> str | None:
    parsed = urlsplit(value)
    if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    host = parsed.hostname.lower().rstrip(".")
    if parsed.port not in (None, 443):
        return None
    path = parsed.path or "/"
    return urlunsplit(("https", host, path, parsed.query, ""))


def url_host(url: str) -> str:
    return urlsplit(url).hostname.lower()  # type: ignore[union-attr]


def is_hidden(element) -> bool:
    if element.has_attr("hidden") or str(element.get("aria-hidden", "")).strip().casefold() == "true":
        return True
    style = re.sub(r"/\*.*?\*/", "", str(element.get("style", "")), flags=re.DOTALL)
    return bool(re.search(r"(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)", style, re.IGNORECASE))


def visible_text(element) -> str:
    copy = BeautifulSoup(str(element), "html.parser")
    for ignored in reversed(copy.find_all(["script", "style", "noscript", "template", "svg", "form"])):
        ignored.decompose()
    for hidden in reversed(copy.find_all(is_hidden)):
        hidden.decompose()
    return " ".join(copy.get_text(" ", strip=True).split())

def extract_visible_emails(text: str) -> list[str]:
    return sorted({match.group(0).lower() for match in EMAIL_RE.finditer(text)})


def quote_for(text: str, email: str) -> str:
    match = re.search(re.escape(email), text, re.IGNORECASE)
    if match is None:
        return ""
    return text[max(0, match.start() - 240):min(len(text), match.end() + 360)].strip()



def has_election_context(text: str) -> bool:
    return bool(ELECTION_RE.search(searchable_text(text)))


def has_election_year(text: str, election_year: str) -> bool:
    return bool(re.search(rf"(?<!\d){re.escape(election_year)}(?!\d)", text))


def derive_election_year(election_id: str) -> str | None:
    years = {match.group(1) for match in YEAR_RE.finditer(election_id)}
    if len(years) > 1:
        raise ValueError("must not contain multiple four-digit election years")
    return years.pop() if years else None


def has_target_election_context(text: str, election_year: str) -> bool:
    return (
        has_election_context(text)
        and has_election_year(text, election_year)
        and {match.group(1) for match in YEAR_RE.finditer(text)} == {election_year}
    )


def notice_context_excerpt(container, email: str) -> str:
    text = visible_text(container)
    match = re.search(re.escape(email), text, re.IGNORECASE)
    if match is None:
        return ""
    return text[max(0, match.start() - 600):min(len(text), match.end() + 360)].strip()


def local_context_for(block, email: str, election_year: str | None) -> str | None:
    """Return evidence from the mailbox's smallest enclosing grouped notice."""
    block_text = visible_text(block)
    fallback = notice_context_excerpt(block, email) if (
        has_election_context(block_text)
        and (
            election_year is None
            or has_target_election_context(block_text, election_year)
        )
    ) else ""
    for parent in block.parents:
        if parent.name == "main" or str(parent.get("role", "")).strip().casefold() == "main":
            break
        if parent.name not in GROUPED_NOTICE_CONTAINER_TAGS:
            continue
        text = visible_text(parent)
        context = notice_context_excerpt(parent, email)
        if not context:
            continue
        if election_year is None:
            if has_election_context(text):
                return context
            continue
        if has_target_election_context(text, election_year):
            return context
        if has_election_context(text) and YEAR_RE.search(text):
            return None
    return fallback


def main_context_for(block, email: str, election_year: str | None) -> str:
    """Return a main-level context only when it unambiguously names the election."""
    if election_year is None or not has_election_context(visible_text(block)):
        return ""
    for parent in block.parents:
        if parent.name != "main" and str(parent.get("role", "")).strip().casefold() != "main":
            continue
        text = visible_text(parent)
        return (
            notice_context_excerpt(parent, email)
            if has_target_election_context(text, election_year)
            else ""
        )
    return ""


def is_notice_boundary(block) -> bool:
    """Keep sibling traversal within one ungrouped page-local notice."""
    return (
        block.name in GROUPED_NOTICE_CONTAINER_TAGS
        or str(block.get("role", "")).strip().casefold() == "main"
        or bool(block.select(EVIDENCE_BLOCK_SELECTOR))
    )


def sibling_notice_context_for(block, email: str) -> str:
    """Bind a mailbox to a nearby preceding notice, without scanning the page."""
    block_text = visible_text(block)
    for sibling in block.find_previous_siblings(limit=3):
        if is_notice_boundary(sibling):
            return ""
        sibling_text = visible_text(sibling)
        if not has_election_context(sibling_text) or not YEAR_RE.search(sibling_text):
            continue
        context = f"{sibling_text} {block_text}".strip()
        return context if re.search(re.escape(email), context, re.IGNORECASE) else ""
    return ""


def evidence_context_for(block, email: str, election_year: str | None) -> str:
    """Return the narrowest visible notice context associated with a mailbox."""
    local_context = local_context_for(block, email, election_year)
    if local_context is None:
        return ""
    return local_context or sibling_notice_context_for(block, email) or main_context_for(
        block, email, election_year
    )


def election_context_for(quote: str, local_context: str, election_year: str) -> str | None:
    """Accept only evidence bound to the mailbox's own quote or semantic container."""
    for context in (quote, local_context):
        if has_target_election_context(context, election_year):
            return context
    return None



def mailto_target_matches_visible_email(block, email: str) -> bool:
    """Reject a visible mailbox when its mailto destination names another one."""
    for anchor in block.find_all("a", href=True):
        if email not in extract_visible_emails(visible_text(anchor)):
            continue
        target = urlsplit(str(anchor["href"]).strip())
        if target.scheme.casefold() != "mailto":
            continue
        if target.netloc or unquote(target.path).casefold() != email.casefold():
            return False
    return True


def extract_html_evidence(
    html: bytes, election_year: str | None = None
) -> tuple[str, str, list[ElectionEvidence]]:
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.find("h1") or soup.find("title")
    title = visible_text(title_node) if title_node else ""
    page_text = visible_text(soup)
    blocks = soup.select(EVIDENCE_BLOCK_SELECTOR)
    evidence: set[ElectionEvidence] = set()
    for block in blocks:
        text = visible_text(block)
        if not text:
            continue
        for email in extract_visible_emails(text):
            context = evidence_context_for(block, email, election_year)
            if not context:
                continue
            if any(
                email in extract_visible_emails(visible_text(child))
                for child in block.select(EVIDENCE_BLOCK_SELECTOR)
            ):
                continue
            if not mailto_target_matches_visible_email(block, email):
                continue
            quote = quote_for(text, email)
            if quote:
                evidence.add(ElectionEvidence(email, quote, context))
    return title, page_text, sorted(evidence, key=lambda item: (item.email, item.quote, item.context))


def extract_pdf_evidence(pdf: bytes, title_hint: str) -> tuple[str, str, list[ElectionEvidence]]:
    try:
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(pdf))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        return title_hint, "", []
    compact = " ".join(text.split())
    if not has_election_context(compact):
        return title_hint, compact, []
    evidence = []
    for email in extract_visible_emails(compact):
        quote = quote_for(compact, email)
        if quote:
            evidence.append(ElectionEvidence(email, quote, quote))
    return title_hint, compact, sorted(set(evidence), key=lambda item: (item.email, item.quote, item.context))


def fetch(url: str, allowed_hosts: frozenset[str], timeout: float, max_bytes: int, retries: int = 1) -> Response | None:
    for attempt in range(retries + 1):
        try:
            opener = build_opener(RestrictedRedirectHandler(allowed_hosts))
            request = Request(url, headers={"User-Agent": "GlasanjeElectionContactDiscovery/1.0"})
            with opener.open(request, timeout=timeout) as response:
                final_url = absolute_https_url(response.geturl())
                if final_url is None or url_host(final_url) not in allowed_hosts:
                    return None
                length = response.headers.get("Content-Length")
                if length and int(length) > max_bytes:
                    return None
                body = response.read(max_bytes + 1)
                if len(body) > max_bytes:
                    return None
                return Response(final_url, response.headers.get_content_type().lower(), body)
        except (URLError, OSError):
            if attempt < retries:
                time.sleep(0.5)
                continue
            return None
        except (HTTPError, ValueError):
            return None
    return None

def fetch_many(
    urls: Iterable[tuple[str, frozenset[str]]],
    concurrency: int,
    remaining_pages: int,
    timeout: float,
    max_bytes: int,
) -> list[tuple[str, Response | None]]:
    selected = list(urls)[:remaining_pages]
    if not selected:
        return []
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            (url, executor.submit(fetch, url, hosts, timeout, max_bytes))
            for url, hosts in selected
        ]
        return [(url, future.result()) for url, future in futures]


def load_stations(path: Path) -> tuple[dict[str, str], dict[str, tuple[Station, ...]]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}, {}
    country_names: dict[str, str] = {}
    stations_by_country: dict[str, list[Station]] = defaultdict(list)
    for country in payload.get("countries", []):
        code = country.get("countryCode")
        if not isinstance(code, str) or not code:
            continue
        for label_key in ("label", "labelCyr"):
            label = country.get(label_key)
            if isinstance(label, str) and label:
                country_names[normalized_name(label)] = code
        for station in country.get("stations", []):
            station_id = station.get("id")
            website = station.get("website")
            if not isinstance(station_id, str) or not isinstance(website, str):
                continue
            email = station.get("email")
            official_url = absolute_https_url(website)
            if official_url is not None:
                canonical_email = email.lower() if isinstance(email, str) and EMAIL_RE.fullmatch(email) else ""
                stations_by_country[code].append(Station(code, station_id, url_host(official_url), canonical_email))
    return country_names, {
        code: tuple(sorted(set(entries), key=lambda station: station.station_id))
        for code, entries in stations_by_country.items()
    }


def country_links(html: bytes, index_url: str, country_names: dict[str, str]) -> dict[str, set[str]]:
    soup = BeautifulSoup(html, "html.parser")
    result: dict[str, set[str]] = defaultdict(set)
    for anchor in soup.find_all("a", href=True):
        target = absolute_https_url(urljoin(index_url, anchor["href"]))
        if target is None or url_host(target) not in MFA_HOSTS:
            continue
        if "/spoljna-politika/bilateralna-saradnja/" not in urlsplit(target).path:
            continue
        country_code = country_names.get(normalized_name(visible_text(anchor)))
        result.setdefault(target, set())
        if country_code:
            result[target].add(country_code)
    return result


def linked_mission_tasks(
    html: bytes,
    country_code: str,
    stations: tuple[Station, ...],
    page_url: str,
) -> list[PageTask]:
    stations_by_host: dict[str, list[Station]] = defaultdict(list)
    for station in stations:
        stations_by_host[station.website_host].append(station)
    soup = BeautifulSoup(html, "html.parser")
    tasks: dict[str, PageTask] = {}
    for anchor in soup.find_all("a", href=True):
        target = absolute_https_url(urljoin(page_url, anchor["href"]))
        if target is None:
            continue
        linked_stations = tuple(sorted(stations_by_host.get(url_host(target), ()), key=lambda station: station.station_id))
        if not linked_stations:
            continue
        tasks[target] = PageTask(target, country_code, linked_stations, 0, visible_text(anchor))
    return [tasks[url] for url in sorted(tasks)]


def mission_links(html: bytes, task: PageTask) -> list[PageTask]:
    soup = BeautifulSoup(html, "html.parser")
    next_tasks: dict[str, PageTask] = {}
    for anchor in soup.find_all("a", href=True):
        target = absolute_https_url(urljoin(task.url, anchor["href"]))
        if target is None or url_host(target) != url_host(task.url):
            continue
        parsed = urlsplit(target)
        anchor_text = visible_text(anchor)
        is_pdf = parsed.path.lower().endswith(".pdf")
        if FORM_URL_RE.search(parsed.path):
            continue
        if not is_pdf and not ACTIVITY_RE.search(f"{parsed.path} {parsed.query} {anchor_text}"):
            continue
        next_tasks[target] = PageTask(target, task.country_code, task.stations, task.depth + 1, anchor_text)
    return [next_tasks[url] for url in sorted(next_tasks)]

def attributed_stations(
    email: str,
    source_url: str,
    fallback_stations: tuple[Station, ...],
    stations_by_host: dict[str, tuple[Station, ...]],
) -> tuple[Station, ...]:
    """Use an exact canonical mailbox match to attribute shared mission-site evidence."""
    matching_stations = tuple(
        station
        for station in stations_by_host.get(url_host(source_url), ())
        if station.email == email
    )
    return matching_stations or fallback_stations


def candidate_record(
    election_id: str,
    election_year: str,
    station: Station,
    email: str,
    title: str,
    election_context: str,
    quote: str,
    source_url: str,
    observed_at: str,
    evidence_type: str,
) -> dict[str, str]:
    candidate_id_source = "\x1f".join((election_id, station.country_code, station.station_id, email, source_url))
    return {
        "candidateId": hashlib.sha256(candidate_id_source.encode("utf-8")).hexdigest(),
        "electionId": election_id,
        "electionYear": election_year,
        "countryCode": station.country_code,
        "stationId": station.station_id,
        "email": email,
        "title": title,
        "electionContext": election_context,
        "sourceQuote": quote,
        "sourceUrl": source_url,
        "sourceHost": url_host(source_url),
        "observedAt": observed_at,
        "evidenceType": evidence_type,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--election-id", required=True, help="Identifier recorded with every discovered candidate.")
    parser.add_argument(
        "--election-year",
        help="Four-digit target election year; must match an unambiguous year in --election-id when present.",
    )
    parser.add_argument("--output", default="data/election_candidates.json", type=Path)
    parser.add_argument("--missions", default="data/missions_canonical.json", type=Path)
    parser.add_argument("--max-pages", default=500, type=int, help="Maximum total HTTP(S) pages/PDFs to fetch.")
    parser.add_argument("--max-depth", default=2, type=int, help="Maximum links beyond each linked mission homepage.")
    parser.add_argument("--concurrency", default=6, type=int, help="Maximum concurrent HTTP requests.")
    parser.add_argument("--timeout", default=20.0, type=float, help="Per-request timeout in seconds.")
    parser.add_argument("--max-bytes", default=5_000_000, type=int, help="Maximum response size in bytes.")
    args = parser.parse_args()
    if args.max_pages < len(INDEX_URLS):
        parser.error(f"--max-pages must be at least {len(INDEX_URLS)} to fetch all MFA indexes")
    if args.max_depth < 0:
        parser.error("--max-depth must be non-negative")
    if args.concurrency < 1:
        parser.error("--concurrency must be positive")
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    if args.max_bytes < 1:
        parser.error("--max-bytes must be positive")
    if args.output.resolve() == OVERRIDES_PATH:
        parser.error("--output must not resolve to data/overrides.json")
    try:
        derived_year = derive_election_year(args.election_id)
    except ValueError as error:
        parser.error(f"--election-id {error}")
    if args.election_year is not None and not YEAR_VALUE_RE.fullmatch(args.election_year):
        parser.error("--election-year must be a four-digit year")
    if derived_year is not None and args.election_year is not None and args.election_year != derived_year:
        parser.error("--election-year must match the year in --election-id")
    args.election_year = args.election_year or derived_year
    if args.election_year is None:
        parser.error("--election-year is required when --election-id has no unambiguous year")
    return args


def write_output(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def main() -> int:
    args = parse_args()
    observed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    country_names, stations_by_country = load_stations(args.missions)
    stations_by_host_lists: dict[str, list[Station]] = defaultdict(list)
    for stations in stations_by_country.values():
        for station in stations:
            stations_by_host_lists[station.website_host].append(station)
    stations_by_host = {
        host: tuple(sorted(stations, key=lambda station: (station.country_code, station.station_id)))
        for host, stations in stations_by_host_lists.items()
    }
    candidates: dict[str, dict[str, str]] = {}
    fetched_pages = 0

    # An unreadable canonical registry cannot safely be mapped to a station, so
    # produce the valid empty discovery result rather than guessing a recipient.
    if country_names and stations_by_country:
        index_results = fetch_many(
            ((url, MFA_HOSTS) for url in INDEX_URLS),
            args.concurrency,
            args.max_pages,
            args.timeout,
            args.max_bytes,
        )
        fetched_pages += len(index_results)
        country_url_codes: dict[str, set[str]] = defaultdict(set)
        for index_url, response in index_results:
            if response is not None and "html" in response.content_type:
                for country_url, codes in country_links(response.body, index_url, country_names).items():
                    country_url_codes[country_url].update(codes)

        country_results = fetch_many(
            ((url, MFA_HOSTS) for url in sorted(country_url_codes)),
            args.concurrency,
            args.max_pages - fetched_pages,
            args.timeout,
            args.max_bytes,
        )
        fetched_pages += len(country_results)
        initial_tasks: dict[tuple[str, str], PageTask] = {}
        for country_url, response in country_results:
            if response is None or "html" not in response.content_type:
                continue
            soup = BeautifulSoup(response.body, "html.parser")
            h1 = soup.find("h1")
            page_country = country_names.get(normalized_name(visible_text(h1))) if h1 else None
            codes = {page_country} if page_country else country_url_codes[country_url]
            for country_code in sorted(code for code in codes if code):
                for task in linked_mission_tasks(response.body, country_code, stations_by_country.get(country_code, ()), response.url):
                    initial_tasks[(task.country_code, task.url)] = task

        pending = [initial_tasks[key] for key in sorted(initial_tasks)]
        seen_tasks: set[tuple[str, str]] = set()
        while pending and fetched_pages < args.max_pages:
            batch = [task for task in pending if (task.country_code, task.url) not in seen_tasks]
            pending = []
            if not batch:
                break
            batch = batch[: args.max_pages - fetched_pages]
            seen_tasks.update((task.country_code, task.url) for task in batch)
            response_by_url = dict(fetch_many(
                ((task.url, frozenset({url_host(task.url)})) for task in batch),
                args.concurrency,
                args.max_pages - fetched_pages,
                args.timeout,
                args.max_bytes,
            ))
            fetched_pages += len(batch)
            next_tasks: dict[tuple[str, str], PageTask] = {}
            for task in batch:
                response = response_by_url.get(task.url)
                if response is None:
                    continue
                is_pdf = task.url.lower().split("?", 1)[0].endswith(".pdf") or "pdf" in response.content_type
                if is_pdf:
                    title, _, evidence = extract_pdf_evidence(response.body, task.title_hint)
                    evidence_type = "pdf"
                elif "html" in response.content_type:
                    title, _, evidence = extract_html_evidence(response.body, args.election_year)
                    evidence_type = "html"
                    if task.depth < args.max_depth:
                        for next_task in mission_links(response.body, task):
                            key = (next_task.country_code, next_task.url)
                            if key not in seen_tasks:
                                next_tasks[key] = next_task
                else:
                    continue
                for item in evidence:
                    election_context = election_context_for(item.quote, item.context, args.election_year)
                    if election_context is None:
                        continue
                    for station in attributed_stations(item.email, response.url, task.stations, stations_by_host):
                        candidate = candidate_record(
                            args.election_id,
                            args.election_year,
                            station,
                            item.email,
                            title,
                            election_context,
                            item.quote,
                            response.url,
                            observed_at,
                            evidence_type,
                        )
                        candidates[candidate["candidateId"]] = candidate
            pending = [next_tasks[key] for key in sorted(next_tasks)]

    payload = {
        "schemaVersion": 1,
        "electionId": args.election_id,
        "electionYear": args.election_year,
        "generatedAt": observed_at,
        "candidates": [candidates[key] for key in sorted(candidates)],
    }
    write_output(args.output, payload)
    print(f"Wrote {len(payload['candidates'])} election-contact candidates to {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
