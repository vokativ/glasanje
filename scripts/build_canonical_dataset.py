import json
import os
import re
import subprocess
from urllib.parse import urlsplit

from election_contact_contract import (
    ContractError,
    election_authority_is_expired,
    is_valid_mailbox,
    parse_utc_timestamp,
    validate_election_authority,
)

with open("data/mfa_representations.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

# Extract official country mapping from git history
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

# Every named raw country must have a canonical alias before any output is built.
unmapped_raw_countries = sorted({
    country
    for item in raw_data
    if (country := item.get('country')) and country not in country_aliases
})
if unmapped_raw_countries:
    raise ValueError(
        "Cannot build canonical dataset; unmapped raw countries: "
        + ", ".join(repr(country) for country in unmapped_raw_countries)
    )

def to_latin(text):
    if not text:
        return ""
    return "".join(CYR_TO_LAT.get(ch, ch) for ch in text)

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



def normalized_raw_email(value):
    if not isinstance(value, str):
        return ""
    return value.split("?", 1)[0].strip()


def select_mission_email(representation):
    """Choose a syntactically valid listed mailbox without repairing source text."""
    listed_emails = [
        normalized_raw_email(email)
        for email in representation.get("emails", [])
        if isinstance(email, str)
    ]
    valid_listed_emails = [
        email for email in listed_emails if is_valid_mailbox(email)
    ]

    def is_concatenated(email):
        return any(
            email != listed_email and email.startswith(listed_email)
            for listed_email in valid_listed_emails
        )

    primary_email = normalized_raw_email(
        representation.get("primary_consular_email")
    )
    if is_valid_mailbox(primary_email) and not is_concatenated(primary_email):
        return primary_email
    return next(
        (
            email
            for email in valid_listed_emails
            if not is_concatenated(email)
        ),
        "",
    )


PUBLIC_STATION_OVERRIDE_FIELDS = {"website", "address", "embassy", "embassyCyr"}


def validate_overrides(override_data, countries):
    if not isinstance(override_data, dict) or override_data.get("_schemaVersion") != 2:
        raise ValueError("Overrides must be a schemaVersion 2 object")
    mission_overrides = override_data.get("missionOverrides")
    country_overrides = override_data.get("countryOverrides")
    if not isinstance(mission_overrides, dict) or not isinstance(country_overrides, dict):
        raise ValueError("Overrides must contain missionOverrides and countryOverrides objects")

    station_countries = {
        station["id"]: country["countryCode"]
        for country in countries
        for station in country["stations"]
    }
    station_ids = set(station_countries)
    country_codes = set(station_countries.values())
    for country_code, patch in country_overrides.items():
        if country_code not in country_codes or not isinstance(patch, dict):
            raise ValueError(f"Invalid country override for {country_code!r}")
        if set(patch) - {"label", "labelCyr"} or not all(
            isinstance(value, str) and value.strip() for value in patch.values()
        ):
            raise ValueError(f"Country override for {country_code} has unsupported fields")

    for station_id, patch in mission_overrides.items():
        if station_id == "_template":
            if not isinstance(patch, dict):
                raise ValueError("Override template must be an object")
            continue
        if station_id not in station_ids or not isinstance(patch, dict):
            raise ValueError(f"Invalid mission override for {station_id!r}")
        permitted_fields = PUBLIC_STATION_OVERRIDE_FIELDS | {
            "electionAuthority",
            "_legacyElectionContact",
        }
        if set(patch) - permitted_fields:
            raise ValueError(f"Mission override for {station_id} has unsupported fields")
        for field in PUBLIC_STATION_OVERRIDE_FIELDS & set(patch):
            if not isinstance(patch[field], str):
                raise ValueError(f"Mission override for {station_id} has invalid {field}")
        if "_legacyElectionContact" in patch:
            legacy = patch["_legacyElectionContact"]
            if (
                not isinstance(legacy, dict)
                or legacy.get("status") != "inactive"
                or not isinstance(legacy.get("reason"), str)
                or not legacy["reason"].strip()
                or not is_valid_mailbox(legacy.get("electionEmail"))
                or not legacy["provenance"]
            ):
                raise ValueError(f"Mission override for {station_id} has invalid legacy election audit")
        if "electionAuthority" in patch:
            try:
                authority = validate_election_authority(
                    patch["electionAuthority"],
                    f"Mission override for {station_id} electionAuthority",
                    allow_expired=True,
                )
            except ContractError as error:
                raise ValueError(str(error)) from error
            if not is_valid_mailbox(authority["email"]):
                raise ValueError(f"Mission override for {station_id} has invalid election authority email")
            if authority["stationId"] != station_id:
                raise ValueError(
                    f"Mission override for {station_id} election authority is bound to "
                    f"station {authority['stationId']}"
                )
            if authority["countryCode"] != station_countries[station_id]:
                raise ValueError(
                    f"Mission override for {station_id} election authority is bound to "
                    f"country {authority['countryCode']}"
                )
    return mission_overrides, country_overrides

def public_election_authority(authority, label):
    """Project a validated authority into the public runtime contract."""
    evidence_snapshot = authority["evidenceSnapshot"]
    source_url = evidence_snapshot["content"].get("sourceUrl")
    parsed_source = urlsplit(source_url) if isinstance(source_url, str) else None
    source_host = parsed_source.hostname if parsed_source is not None else None
    if (
        not isinstance(source_url, str)
        or not source_url
        or parsed_source.scheme != "https"
        or not source_host
        or (source_host != "mfa.gov.rs" and not source_host.endswith(".mfa.gov.rs"))
    ):
        raise ValueError(f"{label} has no approved MFA source URL")

    expires_at = min(
        authority["approvals"],
        key=lambda approval: parse_utc_timestamp(
            approval["expiresAt"], f"{label} approval expiresAt"
        ),
    )["expiresAt"]
    return {
        "candidateId": authority["candidateId"],
        "electionId": authority["electionId"],
        "electionYear": authority["electionYear"],
        "email": authority["email"],
        "sourceUrl": source_url,
        "expiresAt": expires_at,
        "evidenceSha256": evidence_snapshot["sha256"],
    }


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

for item in raw_data:
    country_cyr = item.get('country')
    if not country_cyr or country_cyr not in country_aliases:
        continue
    code, c_lat, c_cyr = country_aliases[country_cyr]

    for rep in item.get('representations', []):
        sec = rep['section']
        if sec in ['Амбасада', 'Конзулат']:
            emails = rep.get('emails', [])
            primary_email = select_mission_email(rep)

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
                'backupEmails': [e for e in emails if e != primary_email],
            }

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

    # Check resident missions with a valid general mailbox.
    for rep in item.get('representations', []):
        sec = rep['section']
        if sec in ['Амбасада', 'Конзулат']:
            primary_email = select_mission_email(rep)

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
                'missionEmail': primary_email,
                'electionAuthority': None,
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
                primary_email = select_mission_email(rep)
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
                    'missionEmail': primary_email,
                    'electionAuthority': None,
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

# Preserve established station IDs unless multiple missions produce the same
# base ID. Colliding missions receive a readable, source-derived identity.
stations_by_base_id = {}
for country in countries_list:
    for station in country['stations']:
        stations_by_base_id.setdefault(station['id'], []).append((country['countryCode'], station))

for base_id, colliding_stations in stations_by_base_id.items():
    if len(colliding_stations) == 1:
        continue

    stations_by_candidate_id = {}
    for country_code, station in colliding_stations:
        suffix = station_identity_suffix(station['website'], station['missionEmail'])
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
            email_suffix = station_email_suffix(station['missionEmail'])
            if not email_suffix:
                raise ValueError(
                    f"Cannot construct deterministic station ID for {country_code} "
                    f"from colliding candidate ID {candidate_id!r}"
                )
            station['id'] = f"{candidate_id}-{email_suffix}"

# Apply complete, validated overrides. A general mission mailbox remains separate
# from a current election authority; no malformed override can become confirmed.
overrides_path = "data/overrides.json"
if os.path.exists(overrides_path):
    with open(overrides_path, "r", encoding="utf-8") as of:
        mission_overrides, country_overrides = validate_overrides(
            json.load(of), countries_list
        )
    for country in countries_list:
        country_patch = country_overrides.get(country["countryCode"])
        if country_patch is not None:
            country.update(country_patch)
        for station in country["stations"]:
            patch = mission_overrides.get(station["id"])
            if patch is None:
                continue
            for field in PUBLIC_STATION_OVERRIDE_FIELDS:
                if field in patch:
                    station[field] = patch[field]
            authority = patch.get("electionAuthority")
            if authority is None:
                continue
            validated_authority = validate_election_authority(
                authority,
                f"Mission override for {station['id']} electionAuthority",
                allow_expired=True,
            )
            if election_authority_is_expired(validated_authority):
                continue
            station["electionAuthority"] = public_election_authority(
                validated_authority,
                f"Mission override for {station['id']} electionAuthority",
            )

# Add catalog search aliases after overrides so search follows the names users see.
# ISO codes intentionally remain outside aliases and are handled as exact matches
# by the client.
for country in countries_list:
    aliases = {
        country['label'],
        country['labelCyr'],
        to_latin(country['labelCyr']),
        *COUNTRY_SEARCH_ALIASES.get(country['countryCode'], ()),
    }
    country['aliases'] = sorted(alias for alias in aliases if alias)

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

with open("data/missions_canonical.json", "w", encoding="utf-8") as f:
    json.dump({
        'schemaVersion': 2,
        'publishedAt': '2026-09-09T14:00:00Z',
        'totalCountries': len(countries_list),
        'countries': countries_list
    }, f, ensure_ascii=False, indent=2)

ts_code = f"""/**
 * CANONICAL DIPLOMATIC MISSIONS DATASET
 * Generated from verified MFA Serbia official records (mfa.gov.rs).
 * Date: 2026-09-09
 */

export interface ElectionAuthority {{
  candidateId: string;
  electionId: string;
  electionYear: string;
  email: string;
  sourceUrl: string;
  expiresAt: string;
  evidenceSha256: string;
}}

export interface PollingStation {{
  id: string;
  embassy: string;
  embassyCyr: string;
  missionEmail: string;
  electionAuthority: ElectionAuthority | null;
  website: string;
  address: string;
  isResident: boolean;
}}

export interface VotingCountry {{
  countryCode: string;
  label: string;
  labelCyr: string;
  aliases?: string[];
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
