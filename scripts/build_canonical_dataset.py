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

ELECTION_CONTACT_APPROVALS = {
    "source-confirmed",
    "operator-approved",
    "unconfirmed",
}


def load_official_coverage_relationships():
    with open("data/official_coverage_relationships.json", "r", encoding="utf-8") as f:
        document = json.load(f)

    if not isinstance(document, dict) or document.get("schemaVersion") != 1:
        raise ValueError(
            "Official coverage relationships must be an object with schemaVersion 1"
        )

    relationships = document.get("relationships")
    if not isinstance(relationships, list):
        raise ValueError("Official coverage relationships must contain a relationships list")

    relationships_by_covered_station_id = {}
    for index, relationship in enumerate(relationships):
        if not isinstance(relationship, dict):
            raise ValueError(f"Official coverage relationship {index} must be an object")

        covered_station_id = relationship.get("coveredStationId")
        covering_station_id = relationship.get("coveringStationId")
        election_email = relationship.get("electionEmail")
        approval = relationship.get("approval")
        provenance = relationship.get("provenance")

        if not isinstance(covered_station_id, str) or not covered_station_id.strip():
            raise ValueError(
                f"Official coverage relationship {index} has no valid coveredStationId"
            )
        if not isinstance(covering_station_id, str) or not covering_station_id.strip():
            raise ValueError(
                f"Official coverage relationship {index} has no valid coveringStationId"
            )
        if covered_station_id == covering_station_id:
            raise ValueError(
                f"Official coverage relationship {covered_station_id!r} covers itself"
            )
        if not is_valid_email(election_email):
            raise ValueError(
                f"Official coverage relationship {covered_station_id!r} has an invalid electionEmail"
            )
        if approval not in ELECTION_CONTACT_APPROVALS:
            raise ValueError(
                f"Official coverage relationship {covered_station_id!r} has an unknown approval"
            )
        if not isinstance(provenance, dict) or provenance.get("kind") != "ministry-coverage":
            raise ValueError(
                f"Official coverage relationship {covered_station_id!r} lacks ministry coverage provenance"
            )
        if covered_station_id in relationships_by_covered_station_id:
            raise ValueError(
                f"Duplicate official coverage relationship for {covered_station_id!r}"
            )

        relationships_by_covered_station_id[covered_station_id] = {
            "coveringStationId": covering_station_id,
            "electionEmail": election_email.strip(),
            "approval": approval,
        }

    return relationships_by_covered_station_id


official_coverage_relationships = load_official_coverage_relationships()

def canonical_website_host(website):
    if not isinstance(website, str) or not website.strip():
        return ""
    parsed = urlsplit(website if '://' in website else f'//{website}')
    host = (parsed.hostname or "").casefold()
    return host[4:] if host.startswith("www.") else host


def normalized_baseline_email(email):
    return email.strip().casefold() if isinstance(email, str) else ""

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

# 1. Build resident mission registry
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
            mission_key = (code, sec, city_cyr, website, primary_email)

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
                'missionKey': mission_key,
                'websiteHost': canonical_website_host(website),
                'baselineEmail': normalized_baseline_email(primary_email),
            }
            all_resident_missions.append(mission_obj)


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
            mission_key = (code, sec, city_cyr, website, primary_email)

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
                '_residentMissionKey': mission_key,
            })

    # If no resident station with email, check non-residential coverage
    if not stations:
        for rep in item.get('representations', []):
            if rep['section'] in ['Покрива на нерезиденцијалној основи', 'Амбасада']:
                website = rep.get('website') or ""
                emails = rep.get('emails', [])
                primary_email = rep.get('primary_consular_email') or (emails[0] if emails else "")
                if '?' in primary_email:
                    primary_email = primary_email.split('?')[0]
                addr = clean_address(rep.get('data', {}).get('Адреса:', ''))

                if not primary_email:
                    continue

                coverage_host = canonical_website_host(website)
                coverage_email = normalized_baseline_email(primary_email)
                covering_candidates = [
                    mission for mission in all_resident_missions
                    if coverage_host
                    and coverage_email
                    and mission['websiteHost'] == coverage_host
                    and mission['baselineEmail'] == coverage_email
                ]
                covering_mission = (
                    covering_candidates[0] if len(covering_candidates) == 1 else None
                )
                # Host and baseline email together can establish an automatic
                # relationship. Host-only matches remain unresolved raw coverage.
                display_mission = covering_mission
                if display_mission:
                    name_cyr = f"{display_mission['nameCyr']} (покрива {c_cyr})"
                    name_lat = f"{display_mission['name']} (pokriva {c_lat})"
                else:
                    name_cyr = f"Надлежно дипломатско представништво (покрива {c_cyr})"
                    name_lat = f"Nadležno diplomatsko predstavništvo (pokriva {c_lat})"

                station_id = f"st-nonres-{code.lower()}"
                station = {
                    'id': station_id,
                    'embassy': name_lat,
                    'embassyCyr': name_cyr,
                    'email': primary_email,
                    'electionContactApproval': "unconfirmed",
                    'isElectionContactConfirmed': False,
                    'website': website,
                    'address': addr,
                    'isResident': False,
                    'coverageSourceEmail': primary_email,
                }
                if covering_mission:
                    station['_coveringMissionKey'] = covering_mission['missionKey']
                stations.append(station)

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

# A coverage source can identify a resident station only by the paired source
# fields. Host-only matches are deliberately not links.
resident_stations_by_mission_key = {}
for country in countries_list:
    for station in country['stations']:
        if station['isResident']:
            mission_key = station.pop('_residentMissionKey')
            resident_stations_by_mission_key.setdefault(mission_key, []).append(station)

# Overrides are the maintained correction layer over the MFA baseline. Resident
# corrections are applied first so a resolved nonresident station can inherit the
# resident's final election-contact state.
overrides_path = "data/overrides.json"
mission_overrides = {}
country_overrides = {}
if os.path.exists(overrides_path):
    try:
        with open(overrides_path, "r", encoding="utf-8") as override_file:
            overrides = json.load(override_file)
        loaded_mission_overrides = overrides.get("missionOverrides", {})
        loaded_country_overrides = overrides.get("countryOverrides", {})
        if isinstance(loaded_mission_overrides, dict):
            mission_overrides = loaded_mission_overrides
        if isinstance(loaded_country_overrides, dict):
            country_overrides = loaded_country_overrides
    except Exception as e:
        print("Warning: failed to read overrides:", e)

manual_coverage_overrides = [
    station_id
    for station_id, patch in mission_overrides.items()
    if isinstance(patch, dict) and "_coverageStationId" in patch
]
if manual_coverage_overrides:
    raise ValueError(
        "Manual _coverageStationId overrides are not supported; use "
        "data/official_coverage_relationships.json: "
        + ", ".join(sorted(manual_coverage_overrides))
    )


def apply_non_election_override(station, patch):
    for key, value in patch.items():
        if (
            not key.startswith("_")
            and key not in {"electionEmail", "coverageSourceEmail", "coveringStationId"}
            and value is not None
        ):
            station[key] = value


def apply_election_contact_override(station, patch):
    approval = election_contact_approval(
        patch.get("_electionContactProvenance")
    )
    station["electionContactApproval"] = approval
    station["isElectionContactConfirmed"] = approval == "source-confirmed"
    election_email = patch.get("electionEmail")
    if is_valid_email(election_email):
        station["email"] = election_email.strip()
        return True
    return False


for country in countries_list:
    country_patch = country_overrides.get(country["countryCode"])
    if isinstance(country_patch, dict):
        country.update(country_patch)
    for station in country["stations"]:
        if not station["isResident"]:
            continue
        patch = mission_overrides.get(station["id"])
        if isinstance(patch, dict):
            apply_non_election_override(station, patch)
            apply_election_contact_override(station, patch)

# Official coverage targets name public station IDs, so validate their resident
# targets after resident overrides have settled station identity.
resident_stations_by_id = {}
nonresident_stations_by_id = {}
for country in countries_list:
    for station in country["stations"]:
        stations_by_id = (
            resident_stations_by_id
            if station["isResident"]
            else nonresident_stations_by_id
        )
        stations_by_id.setdefault(station["id"], []).append(station)

for covered_station_id, relationship in official_coverage_relationships.items():
    covered_stations = nonresident_stations_by_id.get(covered_station_id, [])
    if len(covered_stations) != 1:
        raise ValueError(
            f"Official coverage relationship {covered_station_id!r} must identify "
            "exactly one nonresident station"
        )
    covering_station_id = relationship["coveringStationId"]
    covering_stations = resident_stations_by_id.get(covering_station_id, [])
    if len(covering_stations) != 1:
        raise ValueError(
            f"Official coverage relationship {covered_station_id!r} must identify "
            f"exactly one resident covering station, got {covering_station_id!r}"
        )


def project_covering_mission_identity(station, covering_station, country):
    station["embassy"] = (
        f"{covering_station['embassy']} (pokriva {country['label']})"
    )
    station["embassyCyr"] = (
        f"{covering_station['embassyCyr']} (покрива {country['labelCyr']})"
    )
    station["website"] = covering_station["website"]
    station["address"] = covering_station["address"]


for country in countries_list:
    for station in country["stations"]:
        if station["isResident"]:
            continue

        patch = mission_overrides.get(station["id"])
        has_explicit_election_email = False
        if isinstance(patch, dict):
            apply_non_election_override(station, patch)
            has_explicit_election_email = apply_election_contact_override(station, patch)

        relationship = official_coverage_relationships.get(station["id"])
        raw_covering_stations = resident_stations_by_mission_key.get(
            station.pop('_coveringMissionKey', None),
            [],
        )
        if relationship:
            covering_station = resident_stations_by_id[
                relationship["coveringStationId"]
            ][0]
            project_covering_mission_identity(station, covering_station, country)
        else:
            covering_station = (
                raw_covering_stations[0]
                if len(raw_covering_stations) == 1
                else None
            )

        if covering_station:
            station["coveringStationId"] = covering_station["id"]

        if has_explicit_election_email:
            continue
        if relationship:
            station["email"] = relationship["electionEmail"]
            station["electionContactApproval"] = relationship["approval"]
            station["isElectionContactConfirmed"] = (
                relationship["approval"] == "source-confirmed"
            )
            continue
        if covering_station:
            station["email"] = covering_station["email"]
            station["electionContactApproval"] = covering_station["electionContactApproval"]
            station["isElectionContactConfirmed"] = covering_station["isElectionContactConfirmed"]
            continue

        station["email"] = station["coverageSourceEmail"]
        station["electionContactApproval"] = "unconfirmed"
        station["isElectionContactConfirmed"] = False

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
  coverageSourceEmail?: string;
  coveringStationId?: string;
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
