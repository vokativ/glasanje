# Operativni postupak za izborne adrese misija

Ovaj postupak je namenjen poverljivom održavaocu koji ažurira primaoce izbornih prijava. Svrha mu je da u `data/overrides.json` uđu samo trenutno objavljene, izričito izborne adrese zvaničnih diplomatsko-konzularnih predstavništava. Svaka faza se pokreće zasebno: nijedna faza ne pokreće narednu automatski.

## Granice izvora i podataka

Početak svakog pretraživanja su isključivo ove tri zvanične indeks-stranice Ministarstva spoljnih poslova (MSP):

- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/ambasade>
- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/konzulati>
- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/drzave-pokrivene-na-nerezidencijalnoj-osnovi>

Od njih se smeju pratiti samo stranice država i sajtovi misija na koje MSP izričito vodi. Ne pretražuju se i ne prikupljaju proizvoljni sajtovi trećih strana, društvene mreže, imenici, keširane kopije niti rezultati pretraživača.

U ovoj proceduri dozvoljeni su samo javno objavljeni institucionalni podaci: naziv misije, država/stanica, javno vidljiva izborna adresa, URL, javni tekst obaveštenja i vreme opažanja. **Nikada ne unositi, slati AI-u, čuvati ili obrađivati podatke građana, sadržaj obrazaca, priloge, prijave ili poruke birača.** Adresa se nikada ne sme zaključivati iz domena niti se generički kontakt misije sme označiti izbornim bez eksplicitne izborne namene.

## Dokaz koji v2 kandidat mora da ima

Otkrivanje proizvodi samo **neizabrane** predloge (`selectedForPromotion:false`); nijedan automatski postupak ne bira kandidata niti objavljuje primaoca. Svaki v2 kandidat mora da sadrži:

- javno vidljivu e-mail adresu (`email`);
- tačan citat izvora u kome je adresa vidljiva (`sourceQuote`);
- apsolutni HTTPS URL zvaničnog izvora i njegov tačan host (`sourceUrl`, `sourceHost`);
- jasan izborni kontekst i godinu ciljanih izbora (`electionContext`, `electionYear`);
- identitet države i stanice/misije (`countryCode` i `stationId`);
- vreme opažanja (`observedAt`);
- samoproverljivi snimak javnog dokaza (`evidenceSnapshot`): `capturedAt` mora biti `observedAt`, `content` mora tačno vezati URL, host, naslov, kontekst, citat i adresu, a `sha256` mora odgovarati tom kanonskom sadržaju.

Važeći izborni dokaz je, na primer, aktuelno obaveštenje MSP ili eksplicitno povezane misije koje pominje izbore, glasanje iz inostranstva, birački spisak ili podnošenje izborne prijave i uz to navodi adresu za tu svrhu. `sourceQuote` mora doslovno sadržati adresu; ljudski odobravalac proverava punu živu objavu za izbornu vezu i identitet stanice. Generičko sanduče može biti izabrano samo kada ga aktuelna objava izričito navodi za tu izbornu radnju.

Nevažeći su: opšta stranica „Kontakt“, centrala ili prijem, `info@`/`office@` i sličan generički kontakt bez izborne namene, adresa izvedena iz domena, stara vest bez važećeg izbornog roka, adresar treće strane i sadržaj koji nije eksplicitno povezan sa jednim od dozvoljenih MSP lanaca izvora. Odbaciti adresu koja nije jednostavno oblikovano sanduče ili sadrži parametre, zaglavlja ili kontrolne znake. Posebno: stare adrese oblika `izbori*` iz 2022. godine **nikada se ne prenose** u novi ciklus bez novog, aktuelnog zvaničnog dokaza.

## Tri odvojene CLI faze

Komande i opcije proveriti sa `--help`; zapisati tačnu komandu koja je korišćena uz svaki operativni ciklus.

### 1. Otkrivanje

Pokrenuti:

```bash
python3 scripts/discover_election_contacts.py --election-id 2026-parliamentary --output data/election_candidates.json
```

Faza čita dozvoljene javne izvore i upisuje v2 predloge u `data/election_candidates.json`. Svaki novi predlog je neizabran i vezan za kriptografski snimak javnog dokaza; rezultat otkrivanja sam po sebi ne može aktivirati primaoca.

Pre pokretanja proveriti da je radni skup ograničen na MSP indeks → njegovu stranicu države → eksplicitno povezani sajt misije. Pregledati da svaki kandidat ima sva obavezna polja iz prethodnog odeljka. Kandidat sa nedostajućim poljem, ne-HTTPS URL-om, nevažećim snimkom ili nejasnim izbornim kontekstom odbaciti; ne dopunjavati ga nagađanjem.

### 2. AI pregled (opciono, savetodavan)

Ako je AI krajnja tačka podešena, može se pokrenuti zasebna savetodavna faza nad `data/election_candidates.json`:

```bash
ELECTION_AI_BASE_URL=... ELECTION_AI_API_KEY=... ELECTION_AI_MODEL=... \
  python3 scripts/review_election_candidates.py \
    --input data/election_candidates.json \
    --output data/election_ai_reviews.json
```

AI-u se šalje isključivo provereni javni dokaz kandidata: adresa, citat, zvanični URL, host, izborni kontekst, vreme opažanja i identitet misije. AI samo rangira ili obrazlaže dokaz i može da preporuči odbacivanje. **AI ne može da izabere kandidata, ne može da objavi primaoca, ne može da promeni ljudska odobrenja i nikada ne sme da menja `data/overrides.json`.** Ne prihvatati AI nalaz kao dokaz bez nezavisne ljudske provere izvora.

### 3. Ljudski izbor i promocija

Poverljivi održavalac nezavisno proverava kandidata u njegovom živom zvaničnom izvoru i u `data/missions_canonical.json`. Pre promocije ovlašćeni čovek mora izričito izabrati **tačno jedan** važeći v2 kandidat za istu stanicu i izbore; neizabrani kandidati, više izabranih kandidata i nasleđeni v1 zapisi ne mogu proći. Izbor se beleži samo kontrolisanim operativnim postupkom, nikada AI nalazom ili pretpostavkom.

Svako ljudsko odobrenje beleži se u `data/election_approvals.json` i mora sadržati `candidateId`, `electionId`, stabilni `reviewerId`, `reviewerType:"human"`, `decision:"approve"`, `approvedAt`, `expiresAt` i `evidenceSha256`. `evidenceSha256` mora doslovno odgovarati `evidenceSnapshot.sha256` iz izabranog kandidata, a `expiresAt` mora biti kasnije od `approvedAt` i u budućnosti u trenutku promocije. To nisu polja koja se nagađaju ili prenose iz starog ciklusa.

`data/election_reviewers.json` je pregledana politika: dozvoljeni stabilni ljudski identiteti (`reviewerIds`) i `requiredHumanApprovals`. Bilo koji `reviewerId` koji nije doslovno na listi odbacuje celu promociju. Broj različitih važećih odluka mora tačno odgovarati `requiredHumanApprovals`; duplikat, nepotpuna odluka, isteklo odobrenje ili neslaganje se ne računa.

Pre promocije odobravalac beleži stvarni `evidenceSnapshot.sha256` iz baš onog v2 kandidata koji je pregledao i stvarni rok koji potvrđuje živi izvor. Ne postoji bezbedan podrazumevani hash, rok, izbor ili identitet odobravaoca: ako bilo koji od njih nedostaje, kandidat ostaje neizabran i nepromovisan.

Zatim pokrenuti:

```bash
python3 scripts/promote_election_contacts.py \
  --candidates data/election_candidates.json \
  --approvals data/election_approvals.json \
  --reviewers data/election_reviewers.json \
  --canonical data/missions_canonical.json \
  --overrides data/overrides.json
```

Ako postoji dovršen savetodavni AI pregled, dodati `--reviews data/election_ai_reviews.json`. Faza ponovo nezavisno potvrđuje identitet stanice, države, HTTPS izvor, javno vidljivu adresu i, kada stanica ima kanonski sajt, host izvora. AI preporuka nije zamena za ljudski izbor ni ljudsko odobrenje. Promocija nikada ne menja javni `website` stanice na osnovu hosta kandidata.

Promovisati samo adresu sa aktuelnim zvaničnim izvorom, važećim snimkom dokaza i neisteklim ljudskim odobrenjima. Izvedena `electionAuthority` je vezana za `stationId`, `countryCode` i snimak dokaza; graditelj podataka odbacuje vezu sa drugom stanicom ili državom. Aktuelna je samo dok je `now < expiresAt`. Kada je postojeća vlast istekla, izabrani kandidat sa novim važećim ljudskim odobrenjem je zamenjuje pri sledećoj eksplicitnoj promociji; ne zadržavati niti automatski prenositi primaoca iz prethodnog ciklusa.

## Pregled, čuvanje i trag revizije

Čuvati `election_candidates.json`, svaki korišćeni savetodavni pregled, korišćeni fajl odobrenja, verziju `election_reviewers.json` i promenjeni `overrides.json` kao trag ciklusa, uz datum pokretanja, verziju alata i identitet odobravaoca. Čuvati samo javne institucionalne dokaze i ne dodavati lične podatke ni tajne. Zadržati artefakte najmanje do isteka izbornog roka i završene naknadne provere; zatim ih obrisati prema važećoj politici zadržavanja, osim onoga što je potrebno za javni revizioni trag.

Svaki pregled proverava: dozvoljeni lanac izvora, HTTPS URL, doslovno vidljivu adresu, tačan kanonski host stanice kada postoji, vreme opažanja, integritet snimka, izričit ljudski izbor, rok važenja i broj različitih ljudskih odobrenja iz politike. Ne menjati ručno rezultat AI pregleda niti preskakati proveru kanonske mape misija.

Proveravati ponovo prema stvarno objavljenom izbornom prozoru, promeni roka, povlačenju izvora ili novom zvaničnom obaveštenju. Ne izmišljati raspored, rok, odobrenje ili primaoca kada ih javni izvor ne navodi.

Ako indeks MSP-a, stranica države ili sajt misije nije dostupan, ako URL preusmerava van dozvoljenog lanca, ako nema vidljive izborne veze ili ako fajl odobrenja nije potpun: ne promovisati ništa. Promocija prijavljenog izabranog kandidata koja ne može proći završava se nenultim ishodom sa razlogom; sačuvati bezbednu poruku o grešci bez tajni i bez ličnih podataka i ponoviti tek kada postoji novi proverljiv javni dokaz i eksplicitno ljudsko odobrenje. Kada izvor nestane ili istekne, postojeći živi primalac nije opravdan za dalje korišćenje dok se ne pribavi nov aktuelni dokaz.

## Izdavanje

Nakon uspešne ljudske promocije i pregleda promene, pokrenuti proveru podataka i testove:

```bash
bun run build:data
bun test
```

Produkcijsko izdavanje obavlja održavalac prema privatno čuvanom postupku, uz eksplicitno naveden ID projekta. Ne objavljivati ako `build:data` ili testovi ne uspeju. Pre izdavanja poslednji put potvrditi da svaki promenjeni živi primalac ima aktuelni zvanični izvor i datum isteka.
