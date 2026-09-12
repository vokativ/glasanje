"""Build the public canonical missions artifacts from the MFA scrape and maintained overrides.

The scrape is the baseline source; overrides are the deliberate correction boundary. Both
output files below are generated together and must be rebuilt rather than hand-edited.
"""

import json
import os
import re
import subprocess
import unicodedata
from urllib.parse import urlsplit

# Treat the scraper artifact as external-source input, not as a canonical dataset:
# missing or malformed source fields must be rejected or normalized before publication.
with open("data/mfa_representations.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

# Keep explicit aliases for raw MFA labels whose stable catalog identity cannot be
# inferred mechanically. Historical and existing canonical records below preserve
# established country codes when source wording changes.
country_aliases = {
    'Руска Федерација': ('RU', 'Rusija', 'Русија'),
    'Сједињене Америчке Државе': ('US', 'SAD', 'Сједињене Америчке Државе'),
    'Холандија': ('NL', 'Holandija', 'Холандија'),
    'Кореја, Република': ('KR', 'Južna Koreja', 'Јужна Кореја'),
    'Кореја, ДНР': ('KP', 'Severna Koreja', 'Северна Кореја'),
    'Екваторијална Гвинеја': ('GQ', 'Ekvatorijalna Gvineja', 'Екваторијална Гвинеја'),
    'Маршалова острва': ('MH', 'Maršalska Ostrva', 'Маршалска Острва'),
    'Кабо Верде': ('CV', 'Zelenortska Ostrva', 'Зеленортска Острва'),
    'Конго, Демократска Република': ('CD', 'Demokratska Republika Kongo', 'Демократска Република Конго'),
    'Конго, Република': ('CG', 'Republika Kongo', 'Република Конго'),
    'Сао Томе и Принсипе': ('ST', 'Sao Tome i Prinsipe', 'Сао Томе и Принсипе'),
    'Света Столица': ('VA', 'Vatikan', 'Ватикан (Света Столица)'),
    'Свети Винсент и Гренадини': ('VC', 'Sveti Vinsent i Grenadini', 'Свети Винсент и Гренадини'),
    'Гвинеја, Република': ('GN', 'Gvineja', 'Гвинеја'),
    "Кот д' Ивоар": ('CI', 'Obala Slonovače', 'Обала Слоноваче'),
    'Суверени Војни Малтешки Ред': ('SMOM', 'Suvereni Malteški Red', 'Суверени Малтешки Ред'),
    'Киргиска Република': ('KG', 'Kirgistan', 'Киргизија'),
    'Микронезија': ('FM', 'Mikronezija', 'Микронезија'),
    'Молдавија': ('MD', 'Moldavija', 'Молдавија'),
    'Узбекистан, Република': ('UZ', 'Uzbekistan', 'Узбекистан'),
    'Таџикистан': ('TJ', 'Tadžikistan', 'Таџикистан'),
    'Гвинеја Бисао': ('GW', 'Gvineja Bisao', 'Гвинеја Бисао'),
    'Етиопија': ('ET', 'Etiopija', 'Етиопија'),
    'Танзанија': ('TZ', 'Tanzanija', 'Танзанија'),
}

try:
    res = subprocess.run(["git", "show", "HEAD:src/app/register/form/constants.ts"], capture_output=True, text=True)
    if res.returncode == 0:
        matches = re.findall(r"countryCode:\s*'([A-Z]{2})',\s*label:\s*'([^']+)',\s*labelCyr:\s*'([^']+)'", res.stdout)
        for code, lat, cyr in matches:
            if cyr.strip() not in country_aliases:
                country_aliases[cyr.strip()] = (code, lat.strip(), cyr.strip())
            if lat.strip() not in country_aliases:
                country_aliases[lat.strip()] = (code, lat.strip(), cyr.strip())
except Exception as e:
    print("Could not read git constants:", e)

# The checked-in canonical registry is the durable country-code source when the
# historical UI constants are unavailable. It is read before this script writes
# its replacement output, so a data rebuild retains every established mapping.
try:
    with open("data/missions_canonical.json", "r", encoding="utf-8") as f:
        existing_canonical = json.load(f)
    for country in existing_canonical.get("countries", []):
        code = country.get("countryCode")
        lat = country.get("label")
        cyr = country.get("labelCyr")
        if all(isinstance(value, str) and value.strip() for value in (code, lat, cyr)):
            country_aliases.setdefault(cyr.strip(), (code.strip(), lat.strip(), cyr.strip()))
except (OSError, json.JSONDecodeError, AttributeError):
    pass

CYR_TO_LAT = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E', 'Ж': 'Ž', 'З': 'Z', 'И': 'I',
    'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj', 'М': 'M', 'Н': 'N', 'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R',
    'С': 'S', 'Т': 'T', 'Ћ': 'Ć', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č', 'Џ': 'Dž', 'Ш': 'Š',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e', 'ж': 'ž', 'з': 'z', 'и': 'i',
    'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'ћ': 'ć', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č', 'џ': 'dž', 'ш': 'š'
}

# Serbian Cyrillic alphabetical order, including the distinct single-letter
# characters Љ, Њ, and Џ. The secondary character value makes ties deterministic
# without falling back to Unicode code-point ordering for the alphabet itself.
SERBIAN_CYRILLIC_ALPHABET = "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ"
SERBIAN_CYRILLIC_ORDER = {
    letter: position for position, letter in enumerate(SERBIAN_CYRILLIC_ALPHABET)
}

def serbian_cyrillic_collation_key(label):
    return tuple(
        (SERBIAN_CYRILLIC_ORDER.get(character, len(SERBIAN_CYRILLIC_ORDER)), character)
        for character in label.upper()
    )

# Every raw registry name must have a canonical alias before any output is built.
unmapped_registry_names = sorted({
    country
    for item in raw_data
    if (country := item.get('country')) and country not in country_aliases
})
if unmapped_registry_names:
    raise ValueError(
        "Cannot build canonical dataset; unmapped registry names: "
        + ", ".join(repr(country) for country in unmapped_registry_names)
    )

def to_latin(text):
    if not text:
        return ""
    return "".join(CYR_TO_LAT.get(ch, ch) for ch in text)

def registry_name_key(value):
    transliterated = to_latin(value).casefold()
    decomposed = unicodedata.normalize("NFKD", transliterated)
    return "".join(character for character in decomposed if character.isalnum())


def has_confirmed_evidence_provenance(provenance):
    if not isinstance(provenance, dict):
        return False
    authorization = provenance.get("authorization")
    if isinstance(authorization, dict):
        return authorization.get("type") == "ai" and all(
            isinstance(provenance.get(field), str) and provenance[field]
            for field in ("candidateId", "candidateSetDigest", "evidenceDigest")
        )
    human_approvals = provenance.get("humanApprovals")
    return (
        all(
            isinstance(provenance.get(field), str) and provenance[field]
            for field in ("electionId", "electionYear", "candidateId", "sourceUrl")
        )
        and isinstance(human_approvals, list)
        and any(
            isinstance(approval, dict)
            and approval.get("decision") == "approve"
            and all(
                isinstance(approval.get(field), str) and approval[field]
                for field in ("reviewerId", "approvedAt")
            )
            for approval in human_approvals
        )
    )

def election_contact_approval(provenance):
    if has_confirmed_evidence_provenance(provenance):
        return "source-confirmed"
    if (
        isinstance(provenance, dict)
        and isinstance(provenance.get("authorization"), dict)
        and provenance["authorization"].get("type") == "operator"
    ):
        return "operator-approved"
    return "unconfirmed"

# Search aliases are public catalog metadata only. Keep the source list explicit
# and sort output below so every build produces the same country records.
COUNTRY_SEARCH_ALIASES = {
    'US': (
        'Сједињене Америчке Државе',
        'Sjedinjene Američke Države',
        'Sjedinjene Americke Drzave',
        'United States of America',
        'United States',
        'SAD',
        'САД',
        'USA',
        'УСА',
        'Америка',
        'Amerika',
        'America',
    ),
}

def clean_address(addr):
    if not addr:
        return ""
    return re.sub(r'\s+', ' ', addr).strip()

def is_valid_email(value):
    return isinstance(value, str) and bool(re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', value.strip()))

def station_email_suffix(email):
    local_part = email.split('@', 1)[0].lower()
    return re.sub(r'[^a-z0-9]+', '-', local_part).strip('-')

def station_identity_suffix(website, email):
    if website:
        parsed = urlsplit(website if '://' in website else f'//{website}')
        host = (parsed.hostname or '').lower()
        if host.startswith('www.'):
            host = host[4:]
        suffix = re.sub(r'[^a-z0-9]+', '-', host).strip('-')
        if suffix:
            return suffix

    return station_email_suffix(email)

# 1. Build mission registry
missions_by_domain = {}
all_resident_missions = []

for item in raw_data:
    country_cyr = item.get('country')
    if not country_cyr or country_cyr not in country_aliases:
        continue
    code, c_lat, c_cyr = country_aliases[country_cyr]

    for rep in item.get('representations', []):
        sec = rep['section']
        if sec in ['Амбасада', 'Конзулат']:
            emails = rep.get('emails', [])
            primary_email = rep.get('primary_consular_email') or (emails[0] if emails else "")
            if '?' in primary_email:
                primary_email = primary_email.split('?')[0]

            if code == 'ET' and not primary_email:
                primary_email = "serbambadis@yahoo.com"

            if not primary_email:
                continue

            website = rep.get('website') or ""
            city_cyr = rep.get('city') or ""
            addr = clean_address(rep.get('data', {}).get('Адреса:', ''))

            if sec == 'Амбасада':
                name_cyr = f"Амбасада Републике Србије ({c_cyr})"
                name_lat = f"Ambasada Republike Srbije ({c_lat})"
            else:
                city_label = city_cyr if city_cyr else "Конзулат"
                name_cyr = f"Генерални конзулат Републике Србије ({city_label})"
                name_lat = f"Generalni konzulat Republike Srbije ({to_latin(city_label)})"

            # IDs are derived only from stable source fields so rerunning a scrape does
            # not create anonymous replacements for missions already known to callers.
            mission_id = f"rs-{'emb' if sec == 'Амбасада' else 'cons'}-{code.lower()}-{to_latin(city_cyr).lower() or 'mission'}"
            mission_id = re.sub(r'[^a-z0-9-]+', '', mission_id)

            mission_obj = {
                'id': mission_id,
                'type': 'embassy' if sec == 'Амбасада' else 'consulate',
                'name': name_lat,
                'nameCyr': name_cyr,
                'countryCode': code,
                'country': c_lat,
                'countryCyr': c_cyr,
                'city': to_latin(city_cyr),
                'cityCyr': city_cyr,
                'address': addr,
                'email': primary_email,
                'isElectionContactConfirmed': False,
                'backupEmails': [e for e in emails if e != primary_email],
            }
            all_resident_missions.append(mission_obj)

            if website:
                domain = re.sub(r'^https?://(www\.)?', '', website).rstrip('/')
                missions_by_domain[domain] = mission_obj

# 2. Build final country stations mapping
countries_list = []

for item in raw_data:
    country_cyr = item.get('country')
    if not country_cyr or country_cyr not in country_aliases:
        continue
    code, c_lat, c_cyr = country_aliases[country_cyr]

    stations = []

    # Check resident missions with valid email
    for rep in item.get('representations', []):
        sec = rep['section']
        if sec in ['Амбасада', 'Конзулат']:
            emails = rep.get('emails', [])
            primary_email = rep.get('primary_consular_email') or (emails[0] if emails else "")
            if '?' in primary_email:
                primary_email = primary_email.split('?')[0]
            if code == 'ET' and not primary_email:
                primary_email = "serbambadis@yahoo.com"

            if not primary_email:
                continue

            website = rep.get('website') or ""
            city_cyr = rep.get('city') or ""
            addr = clean_address(rep.get('data', {}).get('Адреса:', ''))

            if sec == 'Амбасада':
                name_cyr = f"Амбасада Републике Србије ({c_cyr})"
                name_lat = f"Ambasada Republike Srbije ({c_lat})"
            else:
                city_label = city_cyr if city_cyr else "Конзулат"
                name_cyr = f"Генерални конзулат Републике Србије ({city_label})"
                name_lat = f"Generalni konzulat Republike Srbije ({to_latin(city_label)})"

            station_id = f"st-{code.lower()}-{'emb' if sec == 'Амбасада' else 'cons'}-{to_latin(city_cyr).lower() or 'main'}"
            station_id = re.sub(r'[^a-z0-9-]+', '', station_id)

            stations.append({
                'id': station_id,
                'embassy': name_lat,
                'embassyCyr': name_cyr,
                'email': primary_email,
                'electionContactApproval': "unconfirmed",
                'isElectionContactConfirmed': False,
                'website': website,
                'address': addr,
                'isResident': True,
            })

    # If no resident station with email, check non-residential coverage
    if not stations:
        for rep in item.get('representations', []):
            if rep['section'] in ['Покрива на нерезиденцијалној основи', 'Амбасада']:
                website = rep.get('website') or ""
                domain = re.sub(r'^https?://(www\.)?', '', website).rstrip('/') if website else ""
                emails = rep.get('emails', [])
                primary_email = rep.get('primary_consular_email') or (emails[0] if emails else "")
                if '?' in primary_email:
                    primary_email = primary_email.split('?')[0]
                addr = clean_address(rep.get('data', {}).get('Адреса:', ''))

                if not primary_email:
                    continue

                covering_mission = missions_by_domain.get(domain)
                if covering_mission:
                    name_cyr = f"{covering_mission['nameCyr']} (покрива {c_cyr})"
                    name_lat = f"{covering_mission['name']} (pokriva {c_lat})"
                else:
                    name_cyr = f"Надлежно дипломатско представништво (покрива {c_cyr})"
                    name_lat = f"Nadležno diplomatsko predstavništvo (pokriva {c_lat})"

                station_id = f"st-nonres-{code.lower()}"

                stations.append({
                    'id': station_id,
                    'embassy': name_lat,
                    'embassyCyr': name_cyr,
                    'email': primary_email,
                    'electionContactApproval': "unconfirmed",
                    'isElectionContactConfirmed': False,
                    'website': website,
                    'address': addr,
                    'isResident': False,
                })

    countries_list.append({
        'countryCode': code,
        'label': c_lat,
        'labelCyr': c_cyr,
        'stations': stations
    })

# Preserve established station IDs unless multiple missions produce the same base ID.
# Collision suffixes are derived from the public website, then the mailbox, rather
# than iteration order; this keeps identifiers reproducible across rebuilds.
stations_by_base_id = {}
for country in countries_list:
    for station in country['stations']:
        stations_by_base_id.setdefault(station['id'], []).append((country['countryCode'], station))

for base_id, colliding_stations in stations_by_base_id.items():
    if len(colliding_stations) == 1:
        continue

    stations_by_candidate_id = {}
    for country_code, station in colliding_stations:
        suffix = station_identity_suffix(station['website'], station['email'])
        if not suffix:
            raise ValueError(
                f"Cannot construct deterministic station ID for {country_code} "
                f"from colliding base ID {base_id!r}"
            )
        candidate_id = f"{base_id}-{suffix}"
        stations_by_candidate_id.setdefault(candidate_id, []).append((country_code, station))

    for candidate_id, candidate_stations in stations_by_candidate_id.items():
        if len(candidate_stations) == 1:
            candidate_stations[0][1]['id'] = candidate_id
            continue

        for country_code, station in candidate_stations:
            email_suffix = station_email_suffix(station['email'])
            if not email_suffix:
                raise ValueError(
                    f"Cannot construct deterministic station ID for {country_code} "
                    f"from colliding candidate ID {candidate_id!r}"
                )
            station['id'] = f"{candidate_id}-{email_suffix}"

# Overrides are the maintained correction layer over the MFA baseline. Private
# provenance fields stay out of stations, while a valid electionEmail intentionally
# replaces the scraped mailbox for the generated public catalog.
overrides_path = "data/overrides.json"
if os.path.exists(overrides_path):
    try:
        with open(overrides_path, "r", encoding="utf-8") as of:
            ov_data = json.load(of)
            m_ov = ov_data.get("missionOverrides", {})
            c_ov = ov_data.get("countryOverrides", {})
            for country in countries_list:
                if country["countryCode"] in c_ov:
                    country.update(c_ov[country["countryCode"]])
                for s in country["stations"]:
                    patch = m_ov.get(s["id"])
                    if not isinstance(patch, dict):
                        continue
                    for k, v in patch.items():
                        if not k.startswith("_") and k != "electionEmail" and v is not None:
                            s[k] = v
                    election_email = patch.get("electionEmail")
                    approval = election_contact_approval(
                        patch.get("_electionContactProvenance")
                    )
                    s["electionContactApproval"] = approval
                    s["isElectionContactConfirmed"] = approval == "source-confirmed"
                    if is_valid_email(election_email):
                        s["email"] = election_email.strip()
    except Exception as e:
        print("Warning: failed to apply overrides:", e)

# Registry names preserve MFA's raw country labels separately from public search
# aliases. They are generated from the raw-name-to-code map so registry discovery
# can match source wording without expanding user-facing aliases.
registry_names_by_code = {}
registry_name_owners = {}
for registry_name, (country_code, _, _) in country_aliases.items():
    if not isinstance(registry_name, str) or not registry_name.strip():
        raise ValueError(f"Cannot build canonical dataset; invalid registry name {registry_name!r}")
    normalized = registry_name_key(registry_name)
    if not normalized:
        raise ValueError(f"Cannot build canonical dataset; invalid registry name {registry_name!r}")
    owner = registry_name_owners.setdefault(normalized, country_code)
    if owner != country_code:
        raise ValueError(
            f"Cannot build canonical dataset; registry name collision for "
            f"{registry_name!r}: {owner} and {country_code}"
        )
    registry_names_by_code.setdefault(country_code, set()).add(registry_name.strip())

# Add catalog search aliases after overrides so search follows the names users see.
# ISO codes intentionally remain outside aliases and are handled as exact matches
# by the client.
country_name_owners = {}
for country in countries_list:
    aliases = {
        country['label'],
        country['labelCyr'],
        to_latin(country['labelCyr']),
        *COUNTRY_SEARCH_ALIASES.get(country['countryCode'], ()),
    }
    country['aliases'] = sorted(alias for alias in aliases if alias)
    country['registryNames'] = sorted(registry_names_by_code.get(country['countryCode'], ()))
    for name in (
        country['label'],
        country['labelCyr'],
        *country['aliases'],
        *country['registryNames'],
    ):
        normalized = registry_name_key(name)
        owner = country_name_owners.setdefault(normalized, country['countryCode'])
        if owner != country['countryCode']:
            raise ValueError(
                f"Cannot build canonical dataset; discovery name collision for "
                f"{name!r}: {owner} and {country['countryCode']}"
            )

# Overrides may replace station IDs, so enforce the global invariant after all
# station mutations and before either canonical output is written.
station_id_locations = {}
for country in countries_list:
    for station in country['stations']:
        station_id = station.get('id')
        if not isinstance(station_id, str) or not station_id:
            raise ValueError(f"Station in {country['countryCode']} has no valid ID")
        station_id_locations.setdefault(station_id, []).append(country['countryCode'])

duplicate_station_ids = {
    station_id: country_codes
    for station_id, country_codes in station_id_locations.items()
    if len(country_codes) > 1
}
if duplicate_station_ids:
    raise ValueError(
        f"Cannot write canonical dataset with duplicate station IDs: "
        f"{duplicate_station_ids}"
    )

countries_list.sort(key=lambda country: serbian_cyrillic_collation_key(country['labelCyr']))

os.makedirs("src/data", exist_ok=True)
# These paired files are generated artifacts with different consumers: the JSON is
# the durable canonical input and TypeScript is the application snapshot. Write both
# from the same in-memory list so they cannot silently describe different stations.

with open("data/missions_canonical.json", "w", encoding="utf-8") as f:
    json.dump({
        'schemaVersion': 1,
        'publishedAt': '2026-09-09T14:00:00Z',
        'totalCountries': len(countries_list),
        'countries': countries_list
    }, f, ensure_ascii=False, indent=2)

ts_code = f"""/**
 * CANONICAL DIPLOMATIC MISSIONS DATASET
 * Generated from verified MFA Serbia official records (mfa.gov.rs).
 * Date: 2026-09-09
 */

export interface PollingStation {{
  id: string;
  embassy: string;
  embassyCyr: string;
  email: string;
  electionContactApproval: 'source-confirmed' | 'operator-approved' | 'unconfirmed';
  isElectionContactConfirmed: boolean;
  website: string;
  address: string;
  isResident: boolean;
}}

export interface VotingCountry {{
  countryCode: string;
  label: string;
  labelCyr: string;
  aliases?: string[];
  registryNames: string[];
  stations: PollingStation[];
}}

export const COUNTRIES: VotingCountry[] = {json.dumps(countries_list, ensure_ascii=False, indent=2)};

export const COUNTRY_BY_CODE = new Map<string, VotingCountry>(
  COUNTRIES.map((c) => [c.countryCode, c])
);
"""

with open("src/data/missions.ts", "w", encoding="utf-8") as f:
    f.write(ts_code)

print(f"Updated dataset with {len(countries_list)} countries.")
