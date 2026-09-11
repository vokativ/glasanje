# Operativni postupak za izborne adrese misija

Ovaj postupak održava javno dokazive adrese za prijave za glasanje iz inostranstva. Ne prikuplja se niti se šalje bilo kakav podatak birača, obrazac, prilog ili poruka. Dopušten je samo javni institucionalni sadržaj iz lanca MSP → država → izričito povezana misija → aktuelno izborno obaveštenje.

Jedan pokretani postupak ima jednog vlasnika: zaključavanje `data/.election_contacts.lock` drži ceo tok. Ako je drugi tok aktivan, komanda se prekida; ne pokretati paralelnu kopiju. Svaki uspešan ili neuspešan prolaz ima sopstveni, nepromenljivi trag u `data/election_runs/<runId>/`.

## Uobičajeni ograničeni prolaz

Pokrenite samo ograničeno inkrementalno otkrivanje, izvoz paketa i proveru spremnosti:

```bash
bun run contacts:run -- --election-id 2026-parliamentary
```

Ovo je bezbedna podrazumevana komanda. Ona:

1. pretražuje samo sledeći ograničeni skup domaćina i stranica (`--max-hosts 5`, `--max-pages 80`, rok 15 s), bez automatskog širenja na potpuni adresar;
2. spaja nov javni dokaz sa trajnim `data/election_candidates.json`, a stanje inkrementalnog rada čuva u `data/election_crawl_state.json`;
3. ispisuje vidljivu listu stanica kojima je potreban pregled i pravi `review-packets.json`;
4. pravi `promotion-dry-run.json` sa `eligibleStationIds`, `held` i `unchangedStationIds`.

Za ovu komandu nisu potrebne AI poverljive vrednosti i ona ne menja `data/overrides.json`. „Nema pronađenog dokaza“ nije isto što i uspešno pokrivena misija: pogledati `discovery-report.json` za neuspehe prenosa, odložene domaćine, budžetska/dubinska ograničenja i nejasne nalaze. Takav delimičan prolaz nije potvrda da je ceo adresar pregledan.

Nasleđeni kandidat sa nepotpunim ili nevezanim dokazom nikada ne dobija paket ni autorizaciju: njegova stanica se pojavljuje kao `held` i mora se ciljano ponovo pribaviti javni izvor. Istorijski zapisi bez `sourceId` i stanice bez javnog sajta (`no-site`) ostaju evidentirani, ali ako nisu izričito izabrani ne zaustavljaju ceo prolaz niti se predstavljaju kao pokrivenost.

Po potrebi ograničite prolaz na konkretne stanice ili budžet:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --station st-de-emb-main --station st-de-cons-minhen --max-pages 120
```

`--station` je ponovljiv. Izričito navedena stanica može se ponovo proveriti i kada je ranije potvrđena; rutinski prolaz je ne proverava samo zato što je već potvrđena.

## AI pregled i autorizacija

Kandidat može biti promovisan samo uz **jedan stvaran, dovršen primarni AI pregled** po politici `data/election_reviewers.json`. Prihvaćeni pregled mora vezati kandidata, skup kandidata za stanicu, izvor i tačne javne citate za tri stvari: aktuelni izbor, adresu za prijavu i identitet stanice. Paket i pregled sadrže stvarni identitet/odgovor poziva kada je dostupan; ne upisivati niti prepisivati ime modela koje nije stvarno prijavljeno.

`asOf` u paketu i pregledu je informativni UTC kontekst procene; nije izvorna tvrdnja niti oslabljuje vezu dokaza. Neizmenljiva veza je hash-vezana za kandidata, skup kandidata stanice, kanonski identitet, URL izvora i hash punog vidljivog teksta izvora. Promocija proverava svežinu izvora prema politici i odbija prihvaćeni pregled kada izvor podržava rok čiji je `validUntil` već prošao.

Za poziv podešene krajnje tačke koristite eksplicitno `--review`; poverljive vrednosti ostaju u lokalnom tajnom okruženju, nikada u repozitorijumu ili artefaktima:

```bash
ELECTION_AI_BASE_URL=https://example.invalid/v1 \
ELECTION_AI_API_KEY=... ELECTION_AI_MODEL=... \
  bun run contacts:run -- --election-id 2026-parliamentary --review
```

Ako se koristi odvojeni AI/harness, najpre pokrenite podrazumevanu komandu i uzmite `review-packets.json` iz ispisanog direktorijuma prolaza. Harness mora pozvati stvarni model prema formalnoj šemi odgovora iz paketa; zatim se dobijeni artefakt uvozi samo uz izričitu lokalnu potvrdu njegovog porekla:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --import-reviews /bezbedna/putanja/stvarni-harness-reviews.json --attest-import
```

`--attest-import` je namerna tvrdnja operatera da su pregledi prikupljeni iz stvarnih harness poziva. Nije zamena za poziv, nije način za ručno izmišljanje odobrenja i bez njega se uvoz odbija. Uvezena/pozvana evidencija se spaja sa trajnim `data/election_ai_reviews.json`; odbijeni i raniji suprotni pregledi ostaju u tragu.

Arhitekta se ne poziva rutinski. Potreban je samo kada je kandidat `needs_review`, kada postoje konkurentne adrese, promena postojeće adrese za isti izbor ili suprotan primarni nalaz. Tada arhitekta razrešava sve ranije suprotne preglede u istom vezanom skupu dokaza; ne koristi se za nedostatak izvora, nejasan opšti kontakt ili za ubrzavanje prolaza. Istorijski ljudski ledger ostaje arhivski dokaz i ne autorizuje novog kandidata.

## Promocija je posebna, eksplicitna odluka

Tek nakon stvarnog pregleda pokrenite isti ograničeni tok sa `--apply`:

```bash
ELECTION_AI_BASE_URL=https://example.invalid/v1 \
ELECTION_AI_API_KEY=... ELECTION_AI_MODEL=... \
  bun run contacts:run -- --election-id 2026-parliamentary --review --apply
```

ili, za već stvarno prikupljeni i potvrđeni harness artefakt:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --import-reviews /bezbedna/putanja/stvarni-harness-reviews.json \
  --attest-import --apply
```

Pre pisanja, tok uvek pravi novi dry-run. Sa `--apply` bira **samo** `eligibleStationIds` iz tog dry-runa i šalje ih promociji kao eksplicitne stanice. Zadržane stanice (`held`) ostaju nepromenjene, a ako bilo koja izabrana grupa više nije validna promocija se prekida bez delimičnog upisa. `--apply` bez `--review` ili potvrđenog `--import-reviews` se odbija. Tok nikada ne izmišlja pregled, ne premošćava neuspelu raniju fazu i ne menja override pri samom izvozu paketa.

Trajni override čuva postojeće, nevezane ključeve. Staro ljudsko odobrenje i postojeća potvrda ostaju arhivirani; novi izvor dobija AI autorizaciju i njen javni dokaz. Eksplicitna deaktivacija ostaje poseban postupak promocionog alata i inkrementalno otkrivanje je ne poništava.

## Izgradnja podataka i zasebno objavljivanje

Posle uspešnog `--apply`, u radnoj kopiji ponovo izgradite podatke koje koristi frontend, pa proverite i sastavite izdanje:

```bash
bun run build:data
bun run check
bun test
bun run build
```

Ovi koraci pripremaju i proveravaju lokalnu radnu kopiju; ne objavljuju ništa. Produkciono objavljivanje je zasebna, izričita odluka operatera prema važećoj OPERATOR politici, nakon pregleda promena i rezultata ovih koraka. Uspešan `--apply` ili `build:data` ne znači da je izmena već postavljena.

## Potpuni ciklus je odvojen

Potpuno osvežavanje je namerna, odvojena operacija; nikada nije automatski povratak iz inkrementalnog rada:

```bash
bun run contacts:full -- --election-id 2026-parliamentary
```

Ona koristi `--mode full --max-pages 3000 --max-hosts 0` i zato pravi nov `runId` i nov skup artefakata. Pregledati njegove pokazatelje pokrivenosti pre nego što se radi pregled ili promocija. Ne tumačiti raniji inkrementalni izveštaj kao dokaz potpunog ciklusa niti mešati njihove pakete i izveštaje.

## Artefakti, greške i čuvanje

Direktorijum jednog prolaza sadrži najmanje `candidates.json`, `discovery-report.json`, `review-packets.json` kada nema endpointa, `reviews.json` kada je pregled izvršen/uvezen, `promotion-dry-run.json` i `run.json`. `run.json` beleži izabrani režim, granice, faze, rezultat i putanje artefakata. Kandidati i pregledi se čuvaju u trajnim skladištima navedenim gore, dok se pojedinačni artefakti prolaza ne prepisuju.

Ako u izričito izabranom skupu nema stanica koje čekaju pregled, tok čuva izveštaj sa praznom listom spremnosti i `run.json`, pa preskače pregled i promociju. Tada nema novog paketa ni AI odluke; nerešene stanice izvan tog skupa ostaju u trajnoj evidenciji za naredni prolaz.

Ako otkrivanje, pregled, uvoz ili promocija vrati grešku, tok se zaustavlja i kasnije faze se ne izvršavaju. Pročitati `run.json` i odgovarajući izveštaj, ukloniti uzrok i pokrenuti nov prolaz; ne popravljati paket, kandidat ili AI odgovor ručno. Sačuvati samo javni institucionalni dokaz i ne unositi tajne u JSON ili zapis izvršavanja.
