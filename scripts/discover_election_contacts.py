#!/usr/bin/env python3
"""Discover bounded, source-bound election-contact evidence from mission sites.

The crawler accepts only public pages reached through an official MFA-to-
canonical-mission chain.  It records evidence for later review rather than
authorizing recipients: ambiguous, stale, failed, or budget-limited work stays
pending.  Incremental runs rotate a capped host workset; only ``--mode full``
refreshes directory chains, and persisted cursor/report state makes partial
runs recoverable without silently broadening the crawl.
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


EMAIL_RE = re.compile(
    r"(?<![\w.+%-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}(?![\w-]|\.[\w-])",
    re.IGNORECASE,
)
ELECTION_RE = re.compile(
    r"\b(?:izbor\w*|glasanj\w*|birac\w*|election\w*|vot(?:e|ing)\w*|electoral\w*)\b",
    re.IGNORECASE,
)
REGISTRATION_NOTICE_RE = re.compile(
    r"(?:glasan\w*\s+u\s+inostranstv|birac\w*\s+(?:spis|prav)|"
    r"prijav\w*.{0,100}(?:glasan|izbor)|vot\w*\s+(?:from\s+)?abroad|voter\s+regist|electoral\s+roll)",
    re.IGNORECASE,
)
ACTIVITY_RE = re.compile(
    r"(?:aktuelnost\w*|vesti?|obavestenj\w*|news|activit\w*|announcement\w*|saopstenj\w*|izbor\w*|glasanj\w*|birac\w*|election\w*|vot(?:e|ing)\w*)",
    re.IGNORECASE,
)
FORM_URL_RE = re.compile(r"(?:^|[/_.-])(?:form|formular|obrazac)(?:[/_.-]|$)", re.IGNORECASE)
ATTACHMENT_SUFFIXES = frozenset({
    ".doc", ".docm", ".docx", ".odt", ".ppt", ".pptx", ".rtf", ".xls", ".xlsm", ".xlsx",
})
IMAGE_SUFFIXES = frozenset({".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"})

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
    name: str = ""
    is_resident: bool = True
    is_election_contact_confirmed: bool = False


@dataclass(frozen=True)
class PageTask:
    url: str
    country_code: str
    stations: tuple[Station, ...]
    depth: int
    title_hint: str = ""
    source_chain: tuple[str, ...] = ()
    source_selection: str = "crawled"
    requires_local_context: bool = False

@dataclass(frozen=True)
class Response:
    url: str
    content_type: str
    body: bytes
    error: str = ""


@dataclass(frozen=True)
class ElectionEvidence:
    email: str
    quote: str
    context: str


EVIDENCE_BLOCK_SELECTOR = "article, main, [role='main'], section, p, li, td, blockquote"
CONTEXTUAL_CONTAINER_TAGS = frozenset({"article", "section", "li", "td", "blockquote"})
GROUPED_NOTICE_CONTAINER_TAGS = CONTEXTUAL_CONTAINER_TAGS | frozenset({"div"})

class RestrictedRedirectHandler(HTTPRedirectHandler):
    # Redirects are a trust boundary: a valid initial link cannot authorize a
    # page that leaves the verified official host set.
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
            # A long notice can put its year far above the recipient. Preserve
            # the already-validated enclosing context when clipping loses it.
            return context if has_target_election_context(context, election_year) else text
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

def evidence_soup(html: bytes):
    soup = BeautifulSoup(html, "html.parser")
    # Site-wide contacts and navigation must not borrow a notice's year.
    for ignored in reversed(soup.select("nav, footer, aside, [role='navigation'], [role='contentinfo']")):
        ignored.decompose()
    return soup


def extract_html_evidence(
    html: bytes,
    election_year: str | None = None,
    *,
    retain_uncontextualized_evidence: bool = False,
    requires_local_context: bool = False,
) -> tuple[str, str, list[ElectionEvidence]]:
    soup = evidence_soup(html)
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
            context = (
                local_context_for(block, email, election_year)
                if requires_local_context
                else evidence_context_for(block, email, election_year)
            )
            if not context and not retain_uncontextualized_evidence:
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


def extract_html_notice(html: bytes, election_year: str) -> dict | None:
    """Keep an actual election notice even when no mailbox can be extracted.

    A listing/sidebar mentioning elections is not itself a notice. The page's
    own heading must identify elections, with the target year in its content.
    Mailboxes here are observations, never recipient approvals.
    """
    soup = evidence_soup(html)
    heading = soup.find("h1")
    if heading is None or not has_election_context(visible_text(heading)):
        return None
    title = visible_text(heading)
    if YEAR_RE.search(title) and not has_target_election_context(title, election_year):
        return None
    source_text = visible_text(soup)
    content = soup.find("main") or soup.find("article") or soup.body
    if content is None:
        return None
    text = visible_text(content)
    if not REGISTRATION_NOTICE_RE.search(searchable_text(text)):
        return None
    context = next((
        part for part in [title, *(visible_text(p) for p in content.select("p")), text]
        if has_target_election_context(part, election_year) and part in source_text
    ), None)
    if context is None:
        return None
    return {"title": title, "electionContext": context, "emails": extract_visible_emails(text)}


class PdfExtractionError(ValueError):
    """A PDF response could not be read as evidence; it is not an empty notice."""


def extract_pdf_evidence(pdf: bytes, title_hint: str) -> tuple[str, str, list[ElectionEvidence]]:
    try:
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(pdf))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as error:
        raise PdfExtractionError(str(error) or type(error).__name__) from error
    compact = " ".join(text.split())
    if not has_election_context(compact):
        return title_hint, compact, []
    evidence = []
    for email in extract_visible_emails(compact):
        quote = quote_for(compact, email)
        if quote:
            evidence.append(ElectionEvidence(email, quote, quote))
    return title_hint, compact, sorted(set(evidence), key=lambda item: (item.email, item.quote, item.context))

def fetch(url: str, allowed_hosts: frozenset[str], timeout: float, max_bytes: int, retries: int = 1) -> Response:
    """Fetch an HTTPS resource once, retrying only transient transport/status failures."""
    # Size, scheme, host, and retry limits contain untrusted remote responses;
    # a rejected page is reported instead of being treated as empty evidence.
    for attempt in range(retries + 1):
        try:
            opener = build_opener(RestrictedRedirectHandler(allowed_hosts))
            request = Request(url, headers={"User-Agent": "GlasanjeElectionContactDiscovery/1.0"})
            with opener.open(request, timeout=timeout) as response:
                final_url = absolute_https_url(response.geturl())
                if final_url is None or url_host(final_url) not in allowed_hosts:
                    return Response(url, "", b"", "redirect left the verified official host")
                length = response.headers.get("Content-Length")
                if length and int(length) > max_bytes:
                    return Response(url, "", b"", f"response exceeds {max_bytes} byte limit")
                body = response.read(max_bytes + 1)
                if len(body) > max_bytes:
                    return Response(url, "", b"", f"response exceeds {max_bytes} byte limit")
                return Response(final_url, response.headers.get_content_type().lower(), body)
        except HTTPError as error:
            transient = error.code in {408, 425, 429} or 500 <= error.code <= 599
            if transient and attempt < retries:
                time.sleep(0.5)
                continue
            return Response(url, "", b"", f"HTTP {error.code}")
        except (URLError, OSError) as error:
            host = url_host(url)
            if (
                isinstance(error, URLError)
                and "Hostname mismatch" in str(error.reason)
                and host.startswith("www.")
                and host.endswith(".mfa.gov.rs")
            ):
                bare_host = host[4:]
                bare_url = url.replace(f"https://{host}", f"https://{bare_host}", 1)
                return fetch(bare_url, allowed_hosts | {bare_host}, timeout, max_bytes, retries=retries)
            if attempt < retries:
                time.sleep(0.5)
                continue
            return Response(url, "", b"", f"transport failure: {error.reason if isinstance(error, URLError) else error}")
        except ValueError as error:
            return Response(url, "", b"", f"invalid response: {error}")
    return Response(url, "", b"", "retry loop exhausted")

def fetch_many(
    # Select before dispatching so concurrency cannot exceed the remaining page
    # budget when several remote requests complete at once.
    urls: Iterable[tuple[str, frozenset[str]]],
    concurrency: int,
    remaining_pages: int,
    timeout: float,
    max_bytes: int,
) -> list[tuple[str, Response]]:
    selected: list[tuple[str, frozenset[str]]] = []
    seen_urls: set[str] = set()
    for url, hosts in urls:
        if url in seen_urls or len(selected) >= remaining_pages:
            continue
        seen_urls.add(url)
        selected.append((url, hosts))
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
    if not isinstance(payload, dict) or not isinstance(payload.get("countries"), list):
        return {}, {}
    country_names: dict[str, str] = {}
    stations_by_country: dict[str, list[Station]] = defaultdict(list)

    def register_country_name(value: str, code: str) -> None:
        normalized = normalized_name(value)
        if not normalized:
            raise ValueError(f"canonical country {code} has an empty discovery name")
        existing = country_names.get(normalized)
        if existing is not None and existing != code:
            raise ValueError(
                f"canonical country discovery-name collision {value!r}: {existing} and {code}"
            )
        country_names[normalized] = code

    for country in payload["countries"]:
        if not isinstance(country, dict):
            continue
        code = country.get("countryCode")
        if not isinstance(code, str) or not code:
            continue
        for label_key in ("label", "labelCyr"):
            label = country.get(label_key)
            if isinstance(label, str) and label:
                register_country_name(label, code)
        for name_key in ("aliases", "registryNames"):
            names = country.get(name_key, [])
            if names is None:
                continue
            if not isinstance(names, list) or any(not isinstance(name, str) or not name for name in names):
                raise ValueError(f"canonical country {code} has invalid {name_key}")
            for name in names:
                register_country_name(name, code)
        stations = country.get("stations")
        if not isinstance(stations, list):
            continue
        for station in stations:
            if not isinstance(station, dict):
                continue
            station_id = station.get("id")
            website = station.get("website")
            if not isinstance(station_id, str):
                continue
            official_url = absolute_https_url(website) if isinstance(website, str) else None
            email = station.get("email")
            name = station.get("embassy")
            canonical_email = email.lower() if isinstance(email, str) and EMAIL_RE.fullmatch(email) else ""
            stations_by_country[code].append(
                Station(
                    code,
                    station_id,
                    url_host(official_url) if official_url is not None else "",
                    canonical_email,
                    name if isinstance(name, str) else "",
                    bool(station.get("isResident", True)),
                    station.get("isElectionContactConfirmed") is True,
                )
            )
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


def host_variants(host: str) -> frozenset[str]:
    """Return only the canonical www/bare spelling pair, never a wider alias."""
    bare = host[4:] if host.startswith("www.") else host
    return frozenset({bare, f"www.{bare}"})


def linked_mission_tasks(
    html: bytes,
    country_code: str,
    stations: tuple[Station, ...],
    page_url: str,
) -> list[PageTask]:
    stations_by_host: dict[str, list[Station]] = defaultdict(list)
    for station in stations:
        for host in host_variants(station.website_host):
            stations_by_host[host].append(station)
    soup = BeautifulSoup(html, "html.parser")
    tasks: dict[str, PageTask] = {}
    for anchor in soup.find_all("a", href=True):
        linked_url = urljoin(page_url, anchor["href"])
        parsed = urlsplit(linked_url)
        # The official MFA directory still links Salzburg and Podgorica with
        # HTTP hrefs despite HTTPS labels. Try HTTPS on the same known mission
        # host; never fetch HTTP or relax redirect/host validation.
        if (
            parsed.scheme == "http"
            and parsed.hostname in stations_by_host
            and not parsed.username and not parsed.password
            and parsed.port in (None, 80)
        ):
            linked_url = urlunsplit(("https", parsed.hostname, parsed.path, parsed.query, ""))
        target = absolute_https_url(linked_url)
        if target is None:
            continue
        linked_stations = tuple(sorted(set(stations_by_host.get(url_host(target), ())), key=lambda station: station.station_id))
        if not linked_stations:
            continue
        tasks[target] = PageTask(target, country_code, linked_stations, 0, visible_text(anchor))
    return [tasks[url] for url in sorted(tasks)]


def mission_priority(task: PageTask, election_year: str | None) -> tuple[int, str]:
    text = f"{task.url} {task.title_hint}".casefold()
    election = bool(ELECTION_RE.search(searchable_text(text)))
    current = election and election_year is not None and election_year in text
    contact = bool(re.search(r"consul|konzul|kontakt|contact", text))
    return (0 if current else 1 if election else 2 if contact else 3, task.url)


def mission_links(html: bytes, task: PageTask, election_year: str | None = None) -> list[PageTask]:
    soup = BeautifulSoup(html, "html.parser")
    next_tasks: dict[str, PageTask] = {}
    for anchor in soup.find_all("a", href=True):
        target = absolute_https_url(urljoin(task.url, anchor["href"]))
        if target is None or url_host(target) != url_host(task.url):
            continue
        parsed = urlsplit(target)
        anchor_text = visible_text(anchor)
        suffix = Path(parsed.path).suffix.casefold()
        is_pdf = suffix == ".pdf"
        if suffix in ATTACHMENT_SUFFIXES | IMAGE_SUFFIXES or FORM_URL_RE.search(parsed.path):
            continue
        if not is_pdf and not ACTIVITY_RE.search(f"{parsed.path} {parsed.query} {anchor_text}"):
            continue
        next_tasks[target] = PageTask(
            target,
            task.country_code,
            task.stations,
            task.depth + 1,
            anchor_text,
            task.source_chain + (target,),
        )
    return sorted(next_tasks.values(), key=lambda next_task: mission_priority(next_task, election_year))


def attributed_stations(
    email: str,
    fallback_stations: tuple[Station, ...],
    known_mailboxes: frozenset[str],
) -> tuple[Station, ...]:
    """Attribute task matches; never let singleton fallback claim a known mailbox."""
    matching_stations = tuple(station for station in fallback_stations if station.email == email)
    if matching_stations:
        return matching_stations
    if email in known_mailboxes:
        return ()
    return fallback_stations if len(fallback_stations) == 1 else ()


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def source_identifier(source_url: str, text_sha256: str) -> str:
    return hashlib.sha256(canonical_json({"sourceUrl": source_url, "textSha256": text_sha256}).encode("utf-8")).hexdigest()


def normalized_chain(urls: Iterable[str]) -> list[str]:
    chain: list[str] = []
    for url in urls:
        normalized = absolute_https_url(url)
        if normalized is None:
            raise ValueError(f"non-HTTPS URL in verified source chain: {url!r}")
        if not chain or chain[-1] != normalized:
            chain.append(normalized)
    return chain


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
    source_id: str,
    source_chain: Iterable[str],
    source_selection: str = "crawled",
) -> dict[str, object]:
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
        "sourceSelection": source_selection,
        "sourceId": source_id,
        "sourceChain": normalized_chain(source_chain),
    }


def read_mapping(path: Path, label: str) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as error:
        raise ValueError(f"invalid {label} {path}: {error}") from error
    if not isinstance(payload, dict):
        raise ValueError(f"invalid {label} {path}: expected an object")
    return payload


def load_registry(path: Path, country_names: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as error:
        raise ValueError(f"invalid MFA registry {path}: {error}") from error
    if not isinstance(payload, list):
        raise ValueError(f"invalid MFA registry {path}: expected a list")
    result: dict[str, str] = {}
    unmapped_names: set[str] = set()
    for entry in payload:
        if not isinstance(entry, dict):
            raise ValueError(f"invalid MFA registry {path}: country entry is not an object")
        country = entry.get("country")
        location = entry.get("url")
        if not isinstance(country, str) or not isinstance(location, str):
            raise ValueError(f"invalid MFA registry {path}: country entry lacks country or url")
        target = absolute_https_url(urljoin("https://www.mfa.gov.rs/", location))
        if target is None or url_host(target) not in MFA_HOSTS:
            raise ValueError(f"invalid MFA registry {path}: non-official country URL {location!r}")
        if "/spoljna-politika/bilateralna-saradnja/" not in urlsplit(target).path:
            raise ValueError(f"invalid MFA registry {path}: non-country URL {location!r}")
        country_code = country_names.get(normalized_name(country))
        if country_code:
            existing = result.get(country_code)
            if existing is not None and existing != target:
                raise ValueError(f"invalid MFA registry {path}: duplicate country link for {country_code}")
            result[country_code] = target
        else:
            unmapped_names.add(country)
    return result, sorted(unmapped_names)


def load_state(path: Path, election_id: str) -> dict:
    # State is election-scoped.  Refusing a mismatched cursor prevents one
    # election's partial crawl from steering another election's worklist.
    if not path.exists():
        return {"schemaVersion": 1, "electionId": election_id, "hostCursor": 0, "countryChains": {}}
    payload = read_mapping(path, "crawl state")
    if payload.get("schemaVersion") != 1 or payload.get("electionId") != election_id:
        raise ValueError("crawl state belongs to another election or has an unsupported schema")
    if not isinstance(payload.get("hostCursor"), int) or payload["hostCursor"] < 0:
        raise ValueError("crawl state has an invalid hostCursor")
    chains = payload.get("countryChains")
    if not isinstance(chains, dict):
        raise ValueError("crawl state has invalid countryChains")
    for country_code, chain in chains.items():
        if not isinstance(country_code, str) or not isinstance(chain, dict):
            raise ValueError("crawl state has malformed country chain")
        index_url = chain.get("indexUrl")
        country_url = chain.get("countryUrl")
        entries = chain.get("missionEntries")
        normalized_index = absolute_https_url(index_url) if isinstance(index_url, str) else None
        normalized_country = absolute_https_url(country_url) if isinstance(country_url, str) else None
        if (
            normalized_index is None
            or url_host(normalized_index) not in MFA_HOSTS
            or normalized_country is None
            or url_host(normalized_country) not in MFA_HOSTS
            or "/spoljna-politika/bilateralna-saradnja/" not in urlsplit(normalized_country).path
            or not isinstance(entries, list)
        ):
            raise ValueError("crawl state has malformed country chain")
        if any(
            not isinstance(entry, dict)
            or not isinstance(entry.get("url"), str)
            or absolute_https_url(entry["url"]) is None
            for entry in entries
        ):
            raise ValueError("crawl state has malformed mission entry")
    return payload


def load_candidate_artifact(path: Path, election_id: str, election_year: str) -> dict:
    if not path.exists():
        return {"schemaVersion": 1, "electionId": election_id, "electionYear": election_year, "candidates": [], "sources": {}}
    payload = read_mapping(path, "candidate artifact")
    if payload.get("electionId") != election_id or payload.get("electionYear") != election_year:
        raise ValueError("candidate artifact belongs to another election; refusing an incompatible overwrite")
    if not isinstance(payload.get("candidates"), list):
        raise ValueError("candidate artifact has invalid candidates")
    sources = payload.get("sources", {})
    if not isinstance(sources, dict):
        raise ValueError("candidate artifact has invalid sources")
    if not isinstance(payload.get("notices", []), list) or any(
        not isinstance(notice, dict)
        or not isinstance(notice.get("stationId"), str)
        or not isinstance(notice.get("sourceUrl"), str)
        for notice in payload.get("notices", [])
    ):
        raise ValueError("candidate artifact has invalid notices")
    return payload


def load_overrides(path: Path) -> dict:
    payload = read_mapping(path, "overrides")
    if not isinstance(payload.get("missionOverrides", {}), dict):
        raise ValueError("overrides has invalid missionOverrides")
    return payload


def same_election_override(entry: object, election_id: str, election_year: str) -> str:
    if not isinstance(entry, dict):
        return ""
    email = entry.get("electionEmail")
    provenance = entry.get("_electionContactProvenance")
    if (
        isinstance(email, str)
        and EMAIL_RE.fullmatch(email)
        and isinstance(provenance, dict)
        and provenance.get("electionId") == election_id
        and provenance.get("electionYear") == election_year
    ):
        return email.lower()
    return ""


def station_is_suppressed(entry: object, election_id: str) -> bool:
    if not isinstance(entry, dict):
        return False
    suppression = entry.get("_electionContactSuppression")
    if isinstance(suppression, dict):
        if suppression.get("electionId") == election_id:
            return True
        election_ids = suppression.get("electionIds")
        return isinstance(election_ids, list) and election_id in election_ids
    return entry.get("_electionContactSuppressed") is True


def chain_for_country(state: dict, country_code: str) -> dict | None:
    candidate = state["countryChains"].get(country_code)
    if not isinstance(candidate, dict):
        return None
    index_url = candidate.get("indexUrl")
    country_url = candidate.get("countryUrl")
    entries = candidate.get("missionEntries")
    if (
        not isinstance(index_url, str)
        or absolute_https_url(index_url) is None
        or not isinstance(country_url, str)
        or absolute_https_url(country_url) is None
        or not isinstance(entries, list)
    ):
        return None
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("url"), str):
            return None
        if absolute_https_url(entry["url"]) is None:
            return None
    return candidate


def station_host_tasks(
    stations: Iterable[Station],
    entry_url: str,
    country_code: str,
    source_chain: Iterable[str],
) -> PageTask:
    return PageTask(
        entry_url,
        country_code,
        tuple(sorted(set(stations), key=lambda station: station.station_id)),
        0,
        "",
        tuple(normalized_chain(source_chain)),
    )

def direct_notice_tasks(
    stations: Iterable[Station],
    notice_urls_by_station: dict[str, str],
    country_code: str,
    source_chain: Iterable[str],
) -> list[PageTask]:
    verified_chain = tuple(normalized_chain(source_chain))
    return [
        PageTask(
            notice_url,
            country_code,
            (station,),
            0,
            "",
            verified_chain,
            "operator-notice",
            True,
        )
        for station in stations
        if (notice_url := notice_urls_by_station.get(station.station_id)) is not None
    ]


def validated_notice_urls(
    pairs: Iterable[str],
    station_by_id: dict[str, Station],
    explicitly_requested: set[str],
) -> dict[str, str]:
    notice_urls: dict[str, str] = {}
    stations_by_url: dict[str, str] = {}
    for pair in pairs:
        station_id, separator, raw_url = pair.partition("=")
        if not separator or not station_id or not raw_url:
            raise ValueError("--notice-url must be STATION_ID=HTTPS_URL")
        notice_url = absolute_https_url(raw_url)
        if notice_url is None:
            raise ValueError(f"--notice-url for {station_id} must be an HTTPS URL")
        station = station_by_id.get(station_id)
        if station is None:
            raise ValueError(f"--notice-url references unknown station {station_id}")
        if station_id not in explicitly_requested:
            raise ValueError(f"--notice-url station {station_id} must be selected with --station")
        if not station.website_host or url_host(notice_url) not in host_variants(station.website_host):
            raise ValueError(f"--notice-url host is not canonical for station {station_id}")
        if station_id in notice_urls:
            raise ValueError(f"duplicate --notice-url for station {station_id}")
        if (other_station := stations_by_url.get(notice_url)) is not None:
            raise ValueError(
                f"--notice-url {notice_url} is already bound to station {other_station}"
            )
        notice_urls[station_id] = notice_url
        stations_by_url[notice_url] = station_id
    return notice_urls


def append_chain(chain: Iterable[str], *urls: str) -> tuple[str, ...]:
    return tuple(normalized_chain((*chain, *urls)))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--election-id", required=True, help="Identifier recorded with every discovered candidate.")
    parser.add_argument(
        "--election-year",
        help="Four-digit target election year; must match an unambiguous year in --election-id when present.",
    )
    parser.add_argument("--output", default="data/election_candidates.json", type=Path)
    parser.add_argument("--missions", default="data/missions_canonical.json", type=Path)
    parser.add_argument("--max-pages", default=80, type=int, help="Maximum total HTTP(S) pages/PDFs to fetch.")
    parser.add_argument("--max-depth", type=int, help="Maximum links beyond each linked mission homepage (default: 2).")
    parser.add_argument("--concurrency", default=2, type=int, help="Maximum concurrent HTTP requests.")
    parser.add_argument("--timeout", default=15.0, type=float, help="Per-request timeout in seconds.")
    parser.add_argument("--max-bytes", default=5_000_000, type=int, help="Maximum response size in bytes.")
    parser.add_argument("--mode", choices=("incremental", "full", "deep-retry"), default="incremental")
    parser.add_argument("--station", action="append", default=[], metavar="ID", help="Crawl this station, including retained stations.")
    parser.add_argument(
        "--notice-url",
        action="append",
        default=[],
        metavar="STATION_ID=HTTPS_URL",
        help="Fetch this station-bound official notice after its MFA mission chain is verified.",
    )
    parser.add_argument("--state", default="data/election_crawl_state.json", type=Path)
    parser.add_argument("--report", default="data/election_crawl_report.json", type=Path)
    parser.add_argument("--overrides", default="data/overrides.json", type=Path)
    parser.add_argument("--registry", default="data/mfa_representations.json", type=Path)
    parser.add_argument("--max-hosts", default=5, type=int, help="Maximum distinct mission hosts this run; 0 means no host cap.")
    args = parser.parse_args()
    if args.max_pages < 1:
        parser.error("--max-pages must be positive")
    if args.max_depth is not None and args.max_depth < 0:
        parser.error("--max-depth must be non-negative")
    if args.mode == "deep-retry":
        if not args.station:
            parser.error("--mode deep-retry requires at least one --station")
        if args.max_depth is not None and args.max_depth != 6:
            parser.error("--mode deep-retry requires --max-depth 6")
        args.max_depth = 6
    elif args.max_depth is None:
        args.max_depth = 2
    if args.notice_url and not args.station:
        parser.error("--notice-url requires at least one --station")
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    if args.max_bytes < 1:
        parser.error("--max-bytes must be positive")
    if args.max_hosts < 0:
        parser.error("--max-hosts must be non-negative")
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
    output_paths = (args.output, args.report)
    input_paths = (args.missions, args.state, args.overrides, args.registry)
    if args.output.resolve() == args.report.resolve():
        parser.error("--output and --report must be different paths")
    if any(args.state.resolve() == source.resolve() for source in (args.missions, args.overrides, args.registry)):
        parser.error("--state must not alias a crawler input")
    for output in output_paths:
        if any(output.resolve() == source.resolve() for source in input_paths):
            parser.error(f"{output} must not alias a crawler input")
    return args


def write_output(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def error_response(response: Response) -> str:
    return response.error or "unsupported response content type"


def main() -> int:
    args = parse_args()
    observed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    run_id = hashlib.sha256(f"{time.time_ns()}:{args.output.resolve()}".encode("utf-8")).hexdigest()[:24]
    try:
        country_names, stations_by_country = load_stations(args.missions)
        if not country_names or not stations_by_country:
            raise ValueError(f"invalid canonical missions {args.missions}")
        registry, unmapped_registry_names = load_registry(args.registry, country_names)
        state = load_state(args.state, args.election_id)
        existing = load_candidate_artifact(args.output, args.election_id, args.election_year)
        overrides = load_overrides(args.overrides)
    except ValueError as error:
        print(f"Election contact discovery failed: {error}", file=sys.stderr)
        return 2

    all_stations = tuple(
        sorted(
            (station for stations in stations_by_country.values() for station in stations),
            key=lambda station: (station.country_code, station.station_id),
        )
    )
    known_mailboxes = frozenset(station.email for station in all_stations if station.email)
    station_by_id = {station.station_id: station for station in all_stations}
    if len(station_by_id) != len(all_stations):
        print("Election contact discovery failed: canonical station IDs are not unique", file=sys.stderr)
        return 2
    requested_ids = tuple(dict.fromkeys(args.station))
    unknown_stations = sorted(set(requested_ids) - set(station_by_id))
    if unknown_stations:
        print(f"Election contact discovery failed: unknown station(s): {', '.join(unknown_stations)}", file=sys.stderr)
        return 2
    try:
        notice_urls_by_station = validated_notice_urls(args.notice_url, station_by_id, set(requested_ids))
    except ValueError as error:
        print(f"Election contact discovery failed: {error}", file=sys.stderr)
        return 2

    notice_hosts = {url_host(url) for url in notice_urls_by_station.values()}
    if args.max_hosts and len(notice_hosts) > args.max_hosts:
        print(
            "Election contact discovery failed: --notice-url targets "
            f"{len(notice_hosts)} hosts, exceeding --max-hosts {args.max_hosts}; "
            "raise the bound or split the explicit notice batch",
            file=sys.stderr,
        )
        return 2

    prior_candidates: dict[str, dict[str, object]] = {}
    for candidate in existing["candidates"]:
        if not isinstance(candidate, dict):
            print("Election contact discovery failed: candidate artifact has malformed candidate", file=sys.stderr)
            return 2
        candidate_id = candidate.get("candidateId")
        station_id = candidate.get("stationId")
        email = candidate.get("email")
        if not isinstance(candidate_id, str) or not isinstance(station_id, str) or not isinstance(email, str):
            print("Election contact discovery failed: candidate artifact has malformed candidate identity", file=sys.stderr)
            return 2
        prior_candidates[candidate_id] = candidate
    sources: dict[str, object] = dict(existing.get("sources", {}))
    notices = {
        (notice["stationId"], notice["sourceUrl"]): notice
        for notice in existing.get("notices", [])
    }
    observed_notices: list[dict] = []
    overrides_by_station = overrides.get("missionOverrides", {})

    def candidate_station_state() -> tuple[set[str], set[str]]:
        # Existing confirmation-like fields are not evidence for this run; only
        # source-backed candidates and matching promoted authority affect reuse.
        source_backed_emails: dict[str, set[str]] = defaultdict(set)
        legacy_emails: dict[str, set[str]] = defaultdict(set)
        for candidate in prior_candidates.values():
            station_id = candidate.get("stationId")
            email = candidate.get("email")
            if (
                candidate.get("electionId") != args.election_id
                or candidate.get("electionYear") != args.election_year
                or not isinstance(station_id, str)
                or not isinstance(email, str)
            ):
                continue
            station = station_by_id.get(station_id)
            if station is None or not station.website_host:
                continue
            source_id = candidate.get("sourceId")
            if isinstance(source_id, str) and isinstance(sources.get(source_id), dict):
                source_backed_emails[station_id].add(email.lower())
            else:
                legacy_emails[station_id].add(email.lower())
        unresolved = {
            station_id
            for station_id, emails in source_backed_emails.items()
            if (
                not (override_email := same_election_override(
                    overrides_by_station.get(station_id), args.election_id, args.election_year
                ))
                or any(email != override_email for email in emails)
            )
        }
        refresh_required = {
            station_id
            for station_id, emails in legacy_emails.items()
            if any(
                email != same_election_override(
                    overrides_by_station.get(station_id), args.election_id, args.election_year
                )
                for email in emails
            )
        }
        return unresolved, refresh_required

    selected_stations = tuple(
        station_by_id[station_id] for station_id in requested_ids
    ) if requested_ids else all_stations
    explicitly_requested = set(requested_ids)
    unresolved_candidate_stations, refresh_required_station_ids = candidate_station_state()
    retained_stations: set[str] = set()
    due_by_host: dict[str, list[Station]] = defaultdict(list)
    for station in selected_stations:
        override = overrides_by_station.get(station.station_id)
        override_email = same_election_override(override, args.election_id, args.election_year)
        suppressed = station_is_suppressed(override, args.election_id)
        if suppressed:
            continue
        if (
            args.mode != "full"
            and station.station_id not in explicitly_requested
            and override_email
            and station.station_id not in unresolved_candidate_stations
            and station.station_id not in refresh_required_station_ids
        ):
            retained_stations.add(station.station_id)
            continue
        if station.website_host:
            due_by_host[station.website_host].append(station)

    host_names = sorted(due_by_host)
    # Explicit station work is a targeted acquisition, not a turn in the
    # routine host rotation.  It may be bounded, but it never consumes cursor
    # state reserved for ordinary incremental discovery.
    routine_cursor = not bool(requested_ids)
    cursor = state["hostCursor"] % len(host_names) if routine_cursor and host_names else 0
    rotated_hosts = host_names[cursor:] + host_names[:cursor] if routine_cursor else host_names
    host_limit = len(rotated_hosts) if args.max_hosts == 0 else min(args.max_hosts, len(rotated_hosts))
    scheduled_hosts = tuple(rotated_hosts[:host_limit])
    deferred_hosts = set(rotated_hosts[host_limit:])
    report_failures: list[dict[str, str]] = []
    report_ambiguous: list[dict[str, object]] = []
    selected_acquisitions: dict[str, dict[str, str]] = {
        station_id: {
            "stationId": station_id,
            "sourceUrl": notice_url,
            "sourceSelection": "operator-notice",
            "outcome": "pending-chain",
        }
        for station_id, notice_url in notice_urls_by_station.items()
    }
    attempted_hosts: set[str] = set()
    failed_hosts: set[str] = set()
    budget_hosts: set[str] = set()
    depth_hosts: set[str] = set()
    ambiguous_stations: set[str] = set()
    fetched_pages = 0
    response_cache: dict[str, Response] = {}

    def fetch_urls(requests: Iterable[tuple[str, frozenset[str]]], scope: str) -> dict[str, Response]:
        nonlocal fetched_pages
        unique: list[tuple[str, frozenset[str]]] = []
        seen_urls: set[str] = set()
        for url, hosts in requests:
            if url in response_cache or url in seen_urls:
                continue
            seen_urls.add(url)
            unique.append((url, hosts))
        available = max(args.max_pages - fetched_pages, 0)
        selected = unique[:available]
        if len(selected) < len(unique):
            report_failures.append({"scope": scope, "reason": "page budget exhausted"})
        if not selected:
            return {}
        results = dict(fetch_many(selected, args.concurrency, available, args.timeout, args.max_bytes))
        fetched_pages += len(results)
        response_cache.update(results)
        return results

    needed_countries = {station.country_code for host in scheduled_hosts for station in due_by_host[host]}
    country_entries: dict[str, list[PageTask]] = defaultdict(list)
    bootstrap_countries: set[str] = set()
    for country_code in needed_countries:
        cached = None if args.mode == "full" else chain_for_country(state, country_code)
        cached_entries = cached.get("missionEntries", []) if cached else []
        by_variant: dict[str, list[dict]] = defaultdict(list)
        for entry in cached_entries:
            if isinstance(entry, dict) and isinstance(entry.get("url"), str):
                by_variant[url_host(entry["url"])].append(entry)
        for host in scheduled_hosts:
            stations = tuple(station for station in due_by_host[host] if station.country_code == country_code)
            if not stations:
                continue
            entries = [entry for variant in host_variants(host) for entry in by_variant.get(variant, [])]
            if len(entries) == 1:
                entry = entries[0]
                source_chain = (cached["indexUrl"], cached["countryUrl"], entry["url"])
                notice_stations = tuple(
                    station for station in stations if station.station_id in notice_urls_by_station
                )
                crawl_stations = tuple(
                    station for station in stations if station.station_id not in notice_urls_by_station
                )
                if crawl_stations:
                    country_entries[country_code].append(
                        station_host_tasks(crawl_stations, entry["url"], country_code, source_chain)
                    )
                country_entries[country_code].extend(
                    direct_notice_tasks(notice_stations, notice_urls_by_station, country_code, source_chain)
                )
            else:
                bootstrap_countries.add(country_code)

    if bootstrap_countries:
        index_results = fetch_urls(((url, MFA_HOSTS) for url in INDEX_URLS), "MFA index")
        confirmed_country_links: dict[str, tuple[str, str]] = {}
        for index_url, response in index_results.items():
            if response.error or "html" not in response.content_type:
                report_failures.append({"scope": "MFA index", "url": index_url, "reason": error_response(response)})
                continue
            for country_url, country_codes in country_links(response.body, response.url, country_names).items():
                for country_code in country_codes:
                    if country_code in bootstrap_countries and registry.get(country_code) == country_url:
                        confirmed_country_links[country_code] = (response.url, country_url)
        index_budget_limited = len(index_results) < len(INDEX_URLS) and fetched_pages >= args.max_pages
        for country_code in sorted(bootstrap_countries - set(confirmed_country_links)):
            for host in scheduled_hosts:
                if not any(station.country_code == country_code for station in due_by_host[host]):
                    continue
                if index_budget_limited:
                    budget_hosts.add(host)
                else:
                    failed_hosts.add(host)
            if not index_budget_limited:
                report_failures.append({"scope": "country chain", "reason": f"registry country link not confirmed for {country_code}"})
        country_results = fetch_urls(
            ((country_url, MFA_HOSTS) for _, country_url in confirmed_country_links.values()),
            "MFA country page",
        )
        for country_code, (index_url, country_url) in confirmed_country_links.items():
            response = country_results.get(country_url) or response_cache.get(country_url)
            if response is None:
                for host in scheduled_hosts:
                    if any(station.country_code == country_code for station in due_by_host[host]):
                        budget_hosts.add(host)
                continue
            if response.error or "html" not in response.content_type:
                report_failures.append(
                    {"scope": "MFA country page", "url": country_url, "reason": error_response(response)}
                )
                for host in scheduled_hosts:
                    if any(station.country_code == country_code for station in due_by_host[host]):
                        failed_hosts.add(host)
                continue
            tasks = linked_mission_tasks(response.body, country_code, stations_by_country.get(country_code, ()), response.url)
            state["countryChains"][country_code] = {
            # Cache only MFA-verified chains; incremental runs may reuse these,
            # while full mode deliberately rebuilds them from public indexes.
                "indexUrl": index_url,
                "countryUrl": response.url,
                "missionEntries": [{"host": url_host(task.url), "url": task.url} for task in tasks],
            }
            for host in scheduled_hosts:
                stations = tuple(station for station in due_by_host[host] if station.country_code == country_code)
                if not stations:
                    continue
                selected_tasks = [task for task in tasks if url_host(task.url) in host_variants(host)]
                if len(selected_tasks) != 1:
                    failed_hosts.add(host)
                    report_failures.append(
                        {"scope": "mission chain", "reason": f"no unique official mission entry for {country_code}/{host}"}
                    )
                    continue
                task = selected_tasks[0]
                source_chain = (index_url, response.url, task.url)
                notice_stations = tuple(
                    station for station in stations if station.station_id in notice_urls_by_station
                )
                crawl_stations = tuple(
                    station for station in stations if station.station_id not in notice_urls_by_station
                )
                if crawl_stations:
                    country_entries[country_code].append(
                        station_host_tasks(crawl_stations, task.url, country_code, source_chain)
                    )
                country_entries[country_code].extend(
                    direct_notice_tasks(notice_stations, notice_urls_by_station, country_code, source_chain)
                )

    pending = [task for country_code in sorted(country_entries) for task in country_entries[country_code]]
    seen_task_keys: set[tuple[str, str, tuple[str, ...], str]] = set()

    def task_key(task: PageTask) -> tuple[str, str, tuple[str, ...], str]:
        return (
            task.country_code,
            task.url,
            tuple(station.station_id for station in task.stations),
            task.source_selection,
        )

    def set_selected_outcome(task: PageTask, outcome: str) -> None:
        if task.source_selection == "operator-notice":
            selected_acquisitions[task.stations[0].station_id]["outcome"] = outcome

    while pending:
        batch: list[PageTask] = []
        for task in pending:
            key = task_key(task)
            if key not in seen_task_keys:
                seen_task_keys.add(key)
                batch.append(task)
        pending = []
        if not batch:
            break
        required = (
            (
                task.url,
                frozenset().union(*(host_variants(station.website_host) for station in task.stations))
                if task.source_selection == "operator-notice"
                else frozenset({url_host(task.url)}),
            )
            for task in batch
        )
        fetch_urls(required, "mission page")
        next_tasks: list[PageTask] = []
        for task in batch:
            response = response_cache.get(task.url)
            task_hosts = {station.website_host for station in task.stations}
            if response is None:
                budget_hosts.update(task_hosts)
                set_selected_outcome(task, "deferred-page-budget")
                continue
            attempted_hosts.update(task_hosts)
            if response.error:
                failed_hosts.update(task_hosts)
                report_failures.append({
                    "scope": "selected notice" if task.source_selection == "operator-notice" else "mission page",
                    "url": task.url,
                    "reason": response.error,
                })
                set_selected_outcome(task, "failed-fetch")
                continue
            if task.source_selection == "operator-notice":
                verified_hosts = frozenset().union(
                    *(host_variants(station.website_host) for station in task.stations)
                )
                final_url = absolute_https_url(response.url)
                if final_url is None or url_host(final_url) not in verified_hosts:
                    failed_hosts.update(task_hosts)
                    report_failures.append({
                        "scope": "selected notice",
                        "url": task.url,
                        "reason": "redirect left the verified station host",
                    })
                    set_selected_outcome(task, "failed-redirect")
                    continue
            is_pdf = task.url.lower().split("?", 1)[0].endswith(".pdf") or "pdf" in response.content_type
            notice = None
            if is_pdf:
                try:
                    title, page_text, evidence = extract_pdf_evidence(response.body, task.title_hint)
                except PdfExtractionError as error:
                    failed_hosts.update(task_hosts)
                    report_failures.append({
                        "scope": "selected notice" if task.source_selection == "operator-notice" else "mission PDF",
                        "url": task.url,
                        "reason": f"PDF parse failure: {error}",
                    })
                    set_selected_outcome(task, "failed-parse")
                    continue
                evidence_type = "pdf"
                if (
                    has_election_context(title)
                    and has_target_election_context(page_text, args.election_year)
                    and REGISTRATION_NOTICE_RE.search(searchable_text(page_text))
                ):
                    notice = {
                        "title": title if title in page_text else page_text[:160].strip(),
                        "electionContext": page_text, "emails": extract_visible_emails(page_text),
                    }
            elif "html" in response.content_type:
                title, page_text, evidence = extract_html_evidence(
                    response.body,
                    args.election_year,
                    requires_local_context=task.requires_local_context,
                )
                evidence_type = "html"
                notice = extract_html_notice(response.body, args.election_year)
                if task.source_selection != "operator-notice":
                    if task.depth < args.max_depth:
                        next_tasks.extend(mission_links(response.body, task, args.election_year))
                    elif any(
                        task_key(link) not in seen_task_keys
                        for link in mission_links(response.body, task, args.election_year)
                    ):
                        # Repeated navigation to this batch or earlier pages
                        # does not mean the depth cap prevented exploration.
                        depth_hosts.update(task_hosts)
            else:
                failed_hosts.update(task_hosts)
                report_failures.append({
                    "scope": "selected notice" if task.source_selection == "operator-notice" else "mission page",
                    "url": task.url,
                    "reason": error_response(response),
                })
                set_selected_outcome(task, "failed-unsupported-media")
                continue
            accepted: list[tuple[ElectionEvidence, tuple[Station, ...], str]] = []
            for item in evidence:
                election_context = election_context_for(item.quote, item.context, args.election_year)
                if election_context is None:
                    continue
                stations = attributed_stations(item.email, task.stations, known_mailboxes)
                if not stations:
                    station_ids = sorted(station.station_id for station in task.stations)
                    ambiguous_stations.update(station_ids)
                    report_ambiguous.append({"sourceUrl": response.url, "email": item.email, "stationIds": station_ids})
                    continue
                accepted.append((item, stations, election_context))
            if not accepted:
                set_selected_outcome(
                    task,
                    "ambiguous" if any(station.station_id in ambiguous_stations for station in task.stations)
                    else "scanned-no-evidence",
                )
                if notice is None:
                    continue
            text_sha256 = hashlib.sha256(page_text.encode("utf-8")).hexdigest()
            source_id = source_identifier(task.url, text_sha256)
            sources[source_id] = {
                "sourceUrl": task.url,
                "finalUrl": response.url,
                "fetchedAt": observed_at,
                "bodySha256": hashlib.sha256(response.body).hexdigest(),
                "textSha256": text_sha256,
                "text": page_text,
                "extractorVersion": "1",
                "sourceSelection": task.source_selection,
            }
            source_chain = append_chain(task.source_chain, task.url, response.url)
            if notice is not None:
                for station in task.stations:
                    record = {
                        **notice,
                        "stationId": station.station_id,
                        "electionId": args.election_id,
                        "electionYear": args.election_year,
                        "sourceId": source_id,
                        "sourceUrl": task.url,
                        "sourceChain": list(source_chain),
                        "observedAt": observed_at,
                        "emailStatus": "email-extracted" if notice["emails"] else "no-email-extracted",
                    }
                    notices[(station.station_id, task.url)] = record
                    observed_notices.append(record)
            for item, stations, election_context in accepted:
                for station in stations:
                    candidate = candidate_record(
                        args.election_id,
                        args.election_year,
                        station,
                        item.email,
                        title,
                        election_context,
                        item.quote,
                        task.url,
                        observed_at,
                        evidence_type,
                        source_id,
                        source_chain,
                        task.source_selection,
                    )
                    prior_candidates[candidate["candidateId"]] = candidate
            if accepted:
                set_selected_outcome(task, "candidate")
        pending = next_tasks

    for station_id, acquisition in selected_acquisitions.items():
        if acquisition["outcome"] != "pending-chain":
            continue
        station = station_by_id[station_id]
        if station.website_host in deferred_hosts or station.website_host in budget_hosts:
            acquisition["outcome"] = "deferred-chain"
        elif station.website_host in failed_hosts:
            acquisition["outcome"] = "failed-chain"
        else:
            acquisition["outcome"] = "failed-chain"

    completed_hosts = attempted_hosts | failed_hosts | depth_hosts
    # Advance only ordinary rotation.  An explicit station run must not consume
    # the routine cursor even when its selected acquisition succeeds.
    completed_prefix = 0
    for host in scheduled_hosts:
        if host not in completed_hosts:
            break
        completed_prefix += 1
    if routine_cursor and host_names:
        state["hostCursor"] = (cursor + completed_prefix) % len(host_names)

    candidate_stations, _ = candidate_station_state()
    pending_station_ids = set(candidate_stations)

    coverage: list[dict[str, object]] = []
    selected_ids = {station.station_id for station in selected_stations}
    for station in all_stations:
        status = "not attempted"
        override = overrides_by_station.get(station.station_id)
        retained_authority = bool(same_election_override(override, args.election_id, args.election_year))
        acquisition = selected_acquisitions.get(station.station_id)
        if not station.website_host:
            status = "no-site"
        elif station_is_suppressed(override, args.election_id):
            status = "suppressed"
        elif acquisition is not None and acquisition["outcome"].startswith("failed"):
            status = "failed-acquisition"
        elif acquisition is not None and acquisition["outcome"].startswith("deferred"):
            status = "deferred-acquisition"
        elif acquisition is not None and acquisition["outcome"] == "ambiguous":
            status = "ambiguous"
        elif station.station_id in selected_ids and station.website_host in failed_hosts:
            status = "failed"
        elif station.station_id in selected_ids and station.website_host in budget_hosts:
            status = "budget-limited"
        elif station.station_id in selected_ids and station.website_host in depth_hosts:
            status = "depth-limited"
        elif station.station_id in candidate_stations:
            status = "candidate"
        elif station.station_id in selected_ids and station.station_id in ambiguous_stations:
            status = "ambiguous"
        elif station.station_id in retained_stations:
            status = "retained"
        elif station.station_id not in selected_ids:
            status = "not attempted"
        elif station.website_host in attempted_hosts:
            status = "scanned-no-evidence"
        elif station.website_host in deferred_hosts:
            status = "not attempted"
        coverage_item: dict[str, object] = {
            "stationId": station.station_id,
            "countryCode": station.country_code,
            "host": station.website_host,
            "isResident": station.is_resident,
            "retainedAuthority": retained_authority,
            "retainedCandidateEvidence": station.station_id in candidate_stations,
            "status": status,
            "noticeUrls": sorted({
                notice["sourceUrl"] for notice in observed_notices
                if notice["stationId"] == station.station_id
            }),
        }
        if acquisition is not None:
            coverage_item["selectedAcquisitionOutcome"] = acquisition["outcome"]
        coverage.append(coverage_item)

    report_ambiguous = list({
        (item["sourceUrl"], item["email"], tuple(item["stationIds"])): item for item in report_ambiguous
    }.values())
    deferred_station_ids = sorted({
        station.station_id
        for station in selected_stations
        if station.website_host in deferred_hosts
        or station.website_host in budget_hosts
        or selected_acquisitions.get(station.station_id, {}).get("outcome", "").startswith("deferred")
    })
    counts: dict[str, int] = defaultdict(int)
    for item in coverage:
        counts[str(item["status"])] += 1
    selected_acquisition_records = [
        selected_acquisitions[station_id] for station_id in sorted(selected_acquisitions)
    ]
    report = {
        "schemaVersion": 1,
        "runId": run_id,
        "electionId": args.election_id,
        "electionYear": args.election_year,
        "mode": args.mode,
        "generatedAt": observed_at,
        "fetchedPages": fetched_pages,
        "maxPages": args.max_pages,
        "maxHosts": args.max_hosts,
        "uniqueMissionHosts": len({station.website_host for station in all_stations if station.website_host}),
        "attemptedMissionHosts": len(attempted_hosts),
        "coverage": coverage,
        "counts": dict(sorted(counts.items())),
        "failures": report_failures,
        "deferredStationIds": deferred_station_ids,
        "unmappedRegistryNames": unmapped_registry_names,
        "selectedAcquisitions": selected_acquisition_records,
        "ambiguous": report_ambiguous,
        "notices": observed_notices,
        "partial": bool(deferred_station_ids or report_failures or budget_hosts or depth_hosts),
    }
    payload = {
        "schemaVersion": 1,
        "electionId": args.election_id,
        "electionYear": args.election_year,
        "generatedAt": observed_at,
        "runId": run_id,
        "pendingStationIds": sorted(pending_station_ids),
        "candidates": [prior_candidates[key] for key in sorted(prior_candidates)],
        "sources": {source_id: sources[source_id] for source_id in sorted(sources)},
        "notices": [notices[key] for key in sorted(notices)],
    }
    write_output(args.output, payload)
    # These are durable, separate artifacts: candidates preserve discovered
    # evidence, state preserves recovery position, and the report explains any
    # partial result to the next operator.
    write_output(args.state, state)
    write_output(args.report, report)
    print(
        f"Wrote {len(payload['candidates'])} election-contact candidates to {args.output}; "
        f"report {args.report} ({len(coverage)} stations, {len(attempted_hosts)} hosts, "
        f"{len(report_failures)} failures, {len(deferred_station_ids)} deferred).",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
