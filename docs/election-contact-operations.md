# Operativni postupak za izborne adrese misija

Ovaj postupak je namenjen poverljivom održavaocu koji ažurira primaoce izbornih prijava. Svrha mu je da u `data/overrides.json` uđu samo trenutno objavljene, izričito izborne adrese zvaničnih diplomatsko-konzularnih predstavništava. Svaka faza se pokreće zasebno: nijedna faza ne pokreće narednu automatski.

## Granice izvora i podataka

Početak svakog pretraživanja su isključivo ove tri zvanične indeks-stranice Ministarstva spoljnih poslova (MSP):

- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/ambasade>
- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/konzulati>
- <https://www.mfa.gov.rs/predstavnistva/predstavnistva-srbije-u-svetu/drzave-pokrivene-na-nerezidencijalnoj-osnovi>

Od njih se smeju pratiti samo stranice država i sajtovi misija na koje MSP izričito vodi. Ne pretražuju se i ne prikupljaju proizvoljni sajtovi trećih strana, društvene mreže, imenici, keširane kopije niti rezultati pretraživača.

U ovoj proceduri dozvoljeni su samo javno objavljeni institucionalni podaci: naziv misije, država/stanica, javno vidljiva izborna adresa, URL, javni tekst obaveštenja i vreme opažanja. **Nikada ne unositi, slati AI-u, čuvati ili obrađivati podatke građana, sadržaj obrazaca, priloge, prijave ili poruke birača.** Adresa se nikada ne sme zaključivati iz domena niti zamenjivati generičkim kontaktom misije.

## Dokaz koji kandidat mora da ima

Kandidat je prihvatljiv samo ako zapis sadrži sve sledeće:

- javno vidljivu e-mail adresu (`email`);
- tačan citat izvora u kome je adresa vidljiva (`sourceQuote`);
- apsolutni HTTPS URL zvaničnog izvora (`sourceUrl`);
- jasan izborni kontekst (`electionContext`);
- vreme opažanja (`observedAt`);
- identitet države i stanice/misije (`countryCode` i `stationId`);
- host izvora (`sourceHost`), identičan normalizovanom hostu `website` polja te stanice u `data/missions_canonical.json`.

Važeći izborni dokaz je, na primer, aktuelno obaveštenje MSP ili eksplicitno povezane misije koje pominje izbore, glasanje iz inostranstva, birački spisak ili podnošenje izborne prijave i uz to navodi adresu za tu svrhu. `sourceQuote` sam mora doslovno sadržati tu adresu, izborni kontekst i radnju podnošenja ili kontakta; naslov stranice, odvojeni tekst na istoj stranici i naziv lokalnog dela adrese nisu dokaz veze. Citat mora pokazati vezu između adrese i izborne radnje; sama adresa na istoj stranici nije dovoljna.

Nevažeći su: opšta stranica „Kontakt“, centrala ili prijem, `info@`/`office@` i sličan generički kontakt bez izborne namene, adresa izvedena iz domena, stara vest bez važećeg izbornog roka, adresar treće strane i sadržaj koji nije eksplicitno povezan sa jednim od dozvoljenih MSP lanaca izvora. Odbaciti adresu koja nije jednostavno oblikovano sanduče ili sadrži parametre, zaglavlja ili kontrolne znake. Posebno: stare adrese oblika `izbori*` iz 2022. godine **nikada se ne prenose** u novi ciklus bez novog, aktuelnog zvaničnog dokaza.

## Tri odvojene CLI faze

Komande i opcije proveriti sa `--help`; zapisati tačnu komandu koja je korišćena uz svaki operativni ciklus.

### 1. Otkrivanje

Pokrenuti:

```bash
python3 scripts/discover_election_contacts.py --election-id 2026-parliamentary --output data/election_candidates.json
```

Faza čita dozvoljene javne izvore i upisuje predloge u `data/election_candidates.json`.

Pre pokretanja proveriti da je radni skup ograničen na MSP indeks → njegovu stranicu države → eksplicitno povezani sajt misije. Pregledati da svaki kandidat ima svih sedam obaveznih polja iz prethodnog odeljka. Kandidat sa nedostajućim poljem, ne-HTTPS URL-om, nejasnim izbornim kontekstom ili generičkom adresom odbaciti; ne dopunjavati ga nagađanjem.

### 2. AI pregled (samo savetodavan)

Pokrenuti zasebnu AI CLI fazu nad `data/election_candidates.json`:

```bash
ELECTION_AI_BASE_URL=... ELECTION_AI_API_KEY=... ELECTION_AI_MODEL=... \
  python3 scripts/review_election_candidates.py \
    --input data/election_candidates.json \
    --output data/election_ai_reviews.json
```

Ona piše preporuke u `data/election_ai_reviews.json`; ne menja kandidate niti `data/overrides.json`. Potrebne OpenAI-kompatibilne promenljive su `ELECTION_AI_BASE_URL`, `ELECTION_AI_API_KEY` i `ELECTION_AI_MODEL`; opcioni mrežni rok je `--timeout` (podrazumevano 30 sekundi). Tajne držati u lokalnom okruženju ili tajnom upravljaču, nikada u repozitorijumu, JSON artefaktima ili dnevniku izvršavanja.

AI-u se šalje isključivo javni dokaz kandidata: adresa, citat, zvanični URL, host, izborni kontekst, vreme opažanja i identitet misije. AI samo rangira ili obrazlaže dokaz i može da preporuči odbacivanje. **AI ne može da objavi primaoca, ne može da promeni ljudska odobrenja i nikada ne sme da menja `data/overrides.json`.** Ne prihvatati AI nalaz kao dokaz bez nezavisne ljudske provere izvora.

### 3. Ljudska promocija

Dva različita poverljiva održavaoca nezavisno proveravaju isti kandidat u njegovom živom zvaničnom izvoru i u `data/missions_canonical.json`. Svako odobrenje beleži se u `data/election_approvals.json`. Fajl počinje sa `{"schemaVersion":1,"approvals":[]}`, a svaki zapis mora imati `candidateId`, `electionId`, stabilni ljudski `reviewerId`, `reviewerType:"human"`, `decision:"approve"` i `approvedAt` u ISO-8601 formatu.

`data/election_reviewers.json` je pregledana dozvoljena lista ljudskih identiteta (`reviewerIds`). U nju se unose samo stabilni identiteti poverljivih održavalaca; bilo koji `reviewerId` koji nije doslovno na listi odbacuje celu promociju. Menjanje te liste zahteva zaštićeni pregled repozitorijuma od **dve različite ovlašćene osobe**; pravila grane moraju zahtevati oba odobrenja pre spajanja. Dve odluke moraju pripadati dvema različitim osobama sa te liste; duplikat, nepotpuna odluka ili neslaganje se ne računa kao dva odobrenja.

Primer pre promocije (zameniti identifikatorima koji već postoje u `data/election_reviewers.json`, ne deliti isti `reviewerId`):

```json
{
  "schemaVersion": 1,
  "approvals": [
    {
      "candidateId": "kandidat-123",
      "electionId": "2026-parliamentary",
      "reviewerType": "human",
      "reviewerId": "odrzavalac-a",
      "decision": "approve",
      "approvedAt": "2026-09-09T12:00:00Z"
    },
    {
      "candidateId": "kandidat-123",
      "electionId": "2026-parliamentary",
      "reviewerType": "human",
      "reviewerId": "odrzavalac-b",
      "decision": "approve",
      "approvedAt": "2026-09-09T12:15:00Z"
    }
  ]
}
```

Tek zatim pokrenuti:

```bash
python3 scripts/promote_election_contacts.py \
  --candidates data/election_candidates.json \
  --reviews data/election_ai_reviews.json \
  --approvals data/election_approvals.json \
  --reviewers data/election_reviewers.json \
  --canonical data/missions_canonical.json \
  --overrides data/overrides.json
```

Faza mora ponovo nezavisno da potvrdi da kandidat odgovara stanici i da `sourceHost` odgovara normalizovanom hostu njenog `website` polja u `data/missions_canonical.json` pre izmene primaoca u `data/overrides.json`. AI preporuka nije zamena ni za jedno ljudsko odobrenje.

Promovisati samo adresu sa aktuelnim zvaničnim izvorom i jasnim rokom važenja. Svaki živi primalac mora imati takav aktuelni izvor i datum isteka; kada izvor istekne, ukloniti ili zameniti primaoca kroz isti postupak. Ne zadržavati primaoca zato što je bio ispravan u prethodnom ciklusu.

## Pregled, čuvanje i trag revizije

Čuvati `election_candidates.json`, `election_ai_reviews.json`, korišćeni fajl odobrenja, verziju `election_reviewers.json` i promenjeni `overrides.json` kao trag ciklusa, uz datum pokretanja, verziju alata i identitete dva odobravaoca. Čuvati samo javne institucionalne dokaze i ne dodavati lične podatke ni tajne. Zadržati artefakte najmanje do isteka izbornog roka i završene naknadne provere; zatim ih obrisati prema važećoj politici zadržavanja, osim onoga što je potrebno za javni revizioni trag.

Svaki pregled proverava: dozvoljeni lanac izvora, HTTPS URL, doslovni citat koji sam sadrži adresu i izbornu radnju, tačan kanonski host stanice, vreme opažanja, rok važenja i oba različita ljudska odobrenja sa dozvoljene liste. Ne menjati ručno rezultat AI pregleda niti preskakati proveru kanonske mape misija.

## Ritam rada i postupanje pri grešci

Dok je MSP ili misija objavila aktivan izborni prozor, otkrivanje i pregled raditi **svakog dana**. Van objavljenog prozora proveravati **jednom nedeljno**. Dodatni prolaz uraditi odmah po novom zvaničnom obaveštenju, promeni roka ili povlačenju izvora.

Ako indeks MSP-a, stranica države ili sajt misije nije dostupan, ako URL preusmerava van dozvoljenog lanca, ako nema vidljive izborne veze, ako AI krajnja tačka ne radi ili ako fajl odobrenja nije potpun: ne promovisati ništa. Sačuvati bezbednu poruku o grešci bez tajni i bez ličnih podataka, označiti ciklus za ponavljanje i pokušati ponovo pri sledećem ritmu ili nakon otklanjanja kvara. Kada izvor nestane ili istekne, postojeći živi primalac nije opravdan za dalje korišćenje dok se ne pribavi nov aktuelni dokaz.

## Izdavanje

Nakon uspešne ljudske promocije i pregleda promene, pokrenuti proveru podataka i testove:

```bash
bun run build:data
bun test
```

Produkcijsko izdavanje obavlja održavalac prema privatno čuvanom postupku, uz eksplicitno naveden ID projekta. Ne objavljivati ako `build:data` ili testovi ne uspeju. Pre izdavanja poslednji put potvrditi da svaki promenjeni živi primalac ima aktuelni zvanični izvor i datum isteka.
