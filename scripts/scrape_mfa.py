"""Fetch MFA representation pages into the raw input consumed by the canonical builder.

This cache is a recoverable scrape artifact, not confirmation that a listed contact is
current or election-authorized; downstream review and promotion establish that authority.
"""

import urllib.request
import re
from bs4 import BeautifulSoup
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import os
import sys

base_url = "https://www.mfa.gov.rs"
PARSER_REVISION = 1
# Bound retries and increasing delays avoid both an unbounded stalled run and rapid
# repeat requests to the external MFA service. The final failure is propagated so a
# failed index page cannot be mistaken for an empty source list.


def get_soup(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                return BeautifulSoup(resp.read(), 'html.parser')
        except Exception as e:
            if i == retries - 1:
                raise e
            time.sleep(1.5 * (i + 1))

os.makedirs("data", exist_ok=True)

print("Fetching index pages from MFA...")
ambasade_soup = get_soup(f"{base_url}/predstavnistva/predstavnistva-srbije-u-svetu/ambasade")
konzulati_soup = get_soup(f"{base_url}/predstavnistva/predstavnistva-srbije-u-svetu/konzulati")
nonres_soup = get_soup(f"{base_url}/predstavnistva/predstavnistva-srbije-u-svetu/drzave-pokrivene-na-nerezidencijalnoj-osnovi")

all_urls = set()
for s in [ambasade_soup, konzulati_soup, nonres_soup]:
    for a in s.find_all('a', href=re.compile(r'/spoljna-politika/bilateralna-saradnja/')):
        all_urls.add(a['href'])

print(f"Total unique bilateral representation URLs: {len(all_urls)}")

cache_file = "data/mfa_representations.json"
# Reuse only successful records produced by this parser revision. Parser changes,
# malformed cache content, and per-page failures are retried on the next run rather
# than being silently promoted into the canonical builder's input.
cached_data = {}
if os.path.exists(cache_file):
    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            for item in json.load(f):
                if (
                    'country' in item
                    and item['country']
                    and not item.get('error')
                    and item.get('parser_revision') == PARSER_REVISION
                ):
                    cached_data[item['url']] = item
    except Exception:
        pass

print(f"Already cached valid countries: {len(cached_data)}")
to_fetch = [u for u in all_urls if u not in cached_data]
print(f"Remaining to fetch: {len(to_fetch)}")

def clean_email(email):
    return email.strip().lower().replace('mailto:', '')

def extract_emails(text, mailto_links):
    # Regex search in text
    found_in_text = [clean_email(e) for e in re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)]
    cleaned_mailtos = [clean_email(e) for e in mailto_links if '@' in e]

    # Priority:
    # 1. Any @mfa.rs email found in visible text
    # 2. Any other email in visible text
    # 3. mailto links (checking for @mfa.rs first)
    all_candidates = []

    for e in found_in_text:
        if e not in all_candidates:
            all_candidates.append(e)

    for e in cleaned_mailtos:
        if e not in all_candidates:
            all_candidates.append(e)

    # Sort with @mfa.rs first
    mfa_emails = [e for e in all_candidates if e.endswith('@mfa.rs') or e.endswith('.mfa.rs')]
    other_emails = [e for e in all_candidates if not (e.endswith('@mfa.rs') or e.endswith('.mfa.rs'))]
    return mfa_emails + other_emails

def parse_page(url_path):
    url = f"{base_url}{url_path}" if url_path.startswith('/') else url_path
    try:
        s = get_soup(url)
    except Exception as e:
        # Preserve a per-page failure in the raw artifact. The cache filter excludes it,
        # ensuring the next run retries this URL instead of treating omission as data.
        return {'url': url_path, 'error': str(e)}

    h1 = s.find('h1')
    country_name = h1.text.strip() if h1 else ""

    flag_img = s.find('img', src=re.compile(r'/flags/'))
    flag_url = flag_img['src'] if flag_img else None

    representations = []

    for table in s.find_all('table'):
        prev_h2 = table.find_previous('h2')
        sec = prev_h2.text.strip() if prev_h2 else ""
        if sec not in ['Амбасада', 'Конзулат', 'Покрива на нерезиденцијалној основи']:
            continue

        # Scope the city lookup to the article containing this table. Searching a
        # page-level ancestor can capture a later representation's city.
        representation = table.find_parent(
            'article', class_=re.compile(r'\bnode--(?:embassy|consulate)\b')
        )
        city_div = representation.find('div', class_=re.compile(r'field--city')) if representation else None
        city = city_div.get_text(strip=True) if city_div else None

        rows = {}
        all_table_text = ""
        mailtos = []
        for tr in table.find_all('tr'):
            tds = tr.find_all(['td', 'th'])
            if len(tds) >= 2:
                k = tds[0].text.strip().replace('\n', ' ')
                v = tds[1].text.strip().replace('\n', ' ')
                for a in tds[1].find_all('a', href=re.compile(r'^mailto:')):
                    mailtos.append(a['href'])
                rows[k] = v
                all_table_text += " " + v

        emails = extract_emails(all_table_text, mailtos)

        # Determine consular email specifically if available
        consular_email = None
        for k, v in rows.items():
            if 'конзуларн' in k.lower():
                c_emails = extract_emails(v, [a['href'] for a in tr.find_all('a', href=re.compile(r'^mailto:'))])
                if c_emails:
                    consular_email = c_emails[0]
                    break
        if not consular_email and emails:
            consular_email = emails[0]

        website = None
        for k, v in rows.items():
            if any(w in k.lower() for w in ['сајт', 'веб', 'web', 'интернет']):
                m = re.search(r'https?://[^\s]+', v)
                if m:
                    website = m.group(0).rstrip('/')

        representations.append({
            'section': sec,
            'city': city,
            'data': rows,
            'emails': emails,
            'primary_consular_email': consular_email,
            'website': website
        })

    return {
        'url': url_path,
        'parser_revision': PARSER_REVISION,
        'country': country_name,
        'flag': flag_url,
        'representations': representations
    }

# Checkpoint completed pages during concurrent work so an interrupted scrape retains
# usable successes. These ordinary file writes protect progress only; they do not make
# the remote fetch set or the whole scrape workflow atomic.
results = list(cached_data.values())
if to_fetch:
    print(f"Fetching {len(to_fetch)} pages with 3 workers and 20s timeout...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(parse_page, u): u for u in to_fetch}
        done_cnt = 0
        for f in as_completed(futures):
            res = f.result()
            results.append(res)
            done_cnt += 1
            if done_cnt % 10 == 0 or done_cnt == len(to_fetch):
                print(f"Progress: {done_cnt}/{len(to_fetch)} pages...")
                with open(cache_file, "w", encoding="utf-8") as out:
                    json.dump(results, out, ensure_ascii=False, indent=2)

with open(cache_file, "w", encoding="utf-8") as out:
    json.dump(results, out, ensure_ascii=False, indent=2)

print(f"Done! Total saved: {len(results)} countries in {cache_file}")
