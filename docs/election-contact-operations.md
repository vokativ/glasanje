# Operativni postupak za izborne adrese misija

Ovaj postupak održava javno dokazive adrese za prijave za glasanje iz inostranstva. Ne prikuplja se niti se šalje bilo kakav podatak birača, obrazac, prilog ili poruka. Dopušten je samo javni institucionalni sadržaj iz lanca MSP → država → izričito povezana misija → aktuelno izborno obaveštenje.

Za kontekst, procenu dokaza i očuvanje objavljenih primalaca prvo pročitati [AGENTS.md](../AGENTS.md). Komande ispod opisuju automatsko prikupljanje i promociju; nisu obavezan dodatni AI krug za već izričito odobrenu odluku operatera. `source-confirmed` i `operator-approved` su oba upotrebljiva izborna primaoca. Neuspeh novog pokušaja ne povlači postojeće odobrenje.

Jedan pokretani postupak ima jednog vlasnika: zaključavanje `data/.election_contacts.lock` drži ceo tok. Ako je drugi tok aktivan, komanda se prekida; ne pokretati paralelnu kopiju. Svaki uspešan ili neuspešan prolaz ima sopstveni, nepromenljivi trag u `data/election_runs/<runId>/`.

## Uobičajeni ograničeni prolaz

Za ručno pregledana izborna obaveštenja nije potrebno prvo pokretati crawler ili praviti arhivu. Sačuvati `electionNotice` u postojećem zapisu stanice u `data/overrides.json`, pa pokrenuti `bun run build:data`. Primer oblika zapisa (vreme označava stvarni pregled izvora):

```json
"electionNotice": {
  "url": "https://vienna.mfa.gov.rs/gradjani/najcesca-pitanja",
  "title": "Избори 2026",
  "electionYear": "2026",
  "observedAt": "2026-09-12T12:39:06Z",
  "emailStatus": "email-extracted"
}
```

Ovo je samo veza ka objavi: ne menja `electionEmail` niti `_electionContactProvenance`. `emailStatus` opisuje izdvajanje iz teksta, a ne odobrenje primaoca. Održavana veza ima prednost nad automatski pronađenom za istu stanicu; sopstvena veza ima prednost nad vezom već razrešene pokrivajuće misije. Graditelj proverava oblik metapodataka, HTTPS URL i identitet stanice, ali ta provera nije dokaz autoriteta ili sadržaja izvora. Ne menjati godinu ili vreme pregleda bez stvarnog pregleda. Nedostajuća veza ne povlači postojeće odobrenje. Pregled svih odobrenih primalaca i preostalih veza je u [evidenciji pregleda](approved-announcement-link-audit.md); interna arhiva je zabeležena kao buduća mogućnost.

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

### Obaveštenje je dokaz i kada nije izdvojena adresa

Crawler sada čuva `notices` u trajnom `data/election_candidates.json`, nezavisno od liste kandidata. Zapis sadrži stanicu, izbor/godinu, naslov, stvarni URL obaveštenja, `sourceId`, službeni `sourceChain`, datum opažanja, tačan izborni kontekst i izdvojene e-adrese. Odgovarajući tekst i hash-evi ostaju u `sources` i kada nema kandidata. `emailStatus` razlikuje `email-extracted` od `no-email-extracted`; nijedna vrednost nije odobrenje primaoca niti tvrdnja da slika/prilog nema adresu.

`discovery-report.json` sadrži samo obaveštenja opažena u tekućem prolazu, a svaka stanica ima `noticeUrls` iz tog prolaza. Konzolni ispis navodi URL i ishod izdvajanja i upozorava kada je prikupljanje delimično. Ranije opaženo obaveštenje ostaje u trajnom artefaktu posle neuspelog ponovnog pokušaja, sa starim datumom opažanja; ne predstavlja se kao nov uspeh.

Prepoznavanje obaveštenja traži izborni naslov same stranice i kontekst ciljne godine. Lista vesti sa vezom ka izborima nije sama po sebi izborno obaveštenje. Navigacija, bočni sadržaj i podnožje ne daju adresu obaveštenja. Dugačak članak zadržava kontekst godine i kada je ona daleko iznad uputstva za slanje. Usputne veze ka slikama ne preuzimaju se kao HTML stranice; izričito zadat nepodržani `--notice-url` i dalje prijavljuje neuspeh.

`bun run build:data` proverava poreklo, hash teksta i vezu ka kanonskoj misiji preko postojećeg validatora izvora, pa dodaje javni `electionNotice` sa URL-om, naslovom, godinom, datumom opažanja i statusom izdvajanja. Bira najnovije opažanje, uz prednost varijante bez `/lat/` kada su datumi isti. Sopstveno obaveštenje stanice ima prednost; inače stanica sa već razrešenim `coveringStationId` može prikazati obaveštenje pokrivajuće misije. Sirove kandidat-adrese ne prenose se ovim putem u javni izbor primaoca.

Veza je vidljiva pri izboru predstavništva i na stranici statusa adresa. Postojeća oznaka odobrenja ostaje nepromenjena. Promena izbora zahteva usklađivanje aplikacije i izborno vezanih artefakata; staro obaveštenje ne preimenovati u obaveštenje za nove izbore.

Nasleđeni kandidat sa nepotpunim ili nevezanim dokazom nikada ne dobija paket ni autorizaciju: njegova stanica se pojavljuje kao `held` i mora se ciljano ponovo pribaviti javni izvor. Istorijski zapisi bez `sourceId` i stanice bez javnog sajta (`no-site`) ostaju evidentirani, ali ako nisu izričito izabrani ne zaustavljaju ceo prolaz niti se predstavljaju kao pokrivenost.

Po potrebi ograničite prolaz na konkretne stanice ili budžet:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --station st-de-emb-main --station st-de-cons-minhen --max-pages 120
```

`--station` je ponovljiv. Izričito navedena stanica može se ponovo proveriti i kada je ranije potvrđena; rutinski prolaz je ne proverava samo zato što je već potvrđena.

## Izričito prikupljanje službenog obaveštenja

Kada je poznat javni URL službenog izbornog obaveštenja, operater ga može dodati kao izvor kandidata pomoću ponovljivog para `--notice-url STATION_ID=HTTPS_URL`. Svaki takav par zahteva i odgovarajuću, izričito navedenu `--station`; stanica iz para mora biti u tom istom skupu. URL se normalizuje kao HTTPS, a njegov domaćin mora biti kanonska varijanta domaćina sajta te misije.

`--notice-url` je tačno ciljana akvizicija, a ne početna tačka za novo pretraživanje. Tek pošto je proverena normalna veza MSP → država → misija, tok pribavlja samo navedeno, za tu stanicu vezano obaveštenje. Ne posećuje početnu stranu, roditeljske/odredišne stranice niti potomke tog URL-a. Čuvaju se i zadati URL i konačni URL posle dopuštenih preusmerenja; zapis kandidata nosi `sourceSelection: "operator-notice"` (obično otkriven kandidat nosi `"crawled"`).

Pre bilo kakvog pribavljanja, paket izričitih obaveštenja mora proći ograničenje `--max-hosts`: broj njegovih jedinstvenih domaćina ne sme ga preći. Operater mora navesti dovoljno visok `--max-hosts`, ili skup podeliti u manje prolaze; tok ne sme menjati rutinski pokazivač domaćina niti zaobilaziti ograničenje zbog izričitog URL-a.

Za paket-only prolaz sa tri poznata službena obaveštenja pokrenite:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --max-hosts 3 \
  --station st-il-emb-main \
  --notice-url st-il-emb-main=https://telaviv.mfa.gov.rs/mediji/aktivnosti/obavestenje-o-postupku-ostvarivanja-birackog-prava-drzavljana-srbije-koji-imaju-boraviste-u-izraelu \
  --station st-de-cons-tutgart \
  --notice-url st-de-cons-tutgart=https://stuttgart.mfa.gov.rs/mediji/aktivnosti/raspisivanje-izbora-za-narodne-poslanike \
  --station st-se-emb-main \
  --notice-url st-se-emb-main=https://stockholm.mfa.gov.rs/mediji/najave-i-obavestenja/raspisivanje-izbora-za-narodne-poslanike-republike-srbije
```

Kraći telavivski put nije važeći URL obaveštenja i vraća 404.

Pronađene veze ka prilozima (`.doc`, `.docx` i slični formati) samo se beleže: ne preuzimaju se automatski i ne proširuju ciljani opseg. Ako je baš navedeno obaveštenje nepodržani medij koji se mora pribaviti, to je stvaran neuspeh, a ne dokaz koji se može premostiti. Izveštaj razdvaja izabrane odložene i neuspele akvizicije od ranije zadržanih kandidata; neuspešan tekući pokušaj ne sme biti prikazan kao uspešan status kandidata.

Ovo je ograničenje automatske akvizicije, ne ocena sadržaja službenog izvora. Crawler ne radi OCR slika i skeniranih PDF-ova. Kada je adresa u slici ili prilogu, otvoriti taj službeni sadržaj dostupnim alatima, vizuelno proveriti adresu i uputstvo i zabeležiti URL i mesto dokaza. Jasan vizuelni dokaz može podržati izričitu odluku operatera; ne prepravljati paket ili AI odgovor da bi izgledalo da ga je tekstualni crawler pročitao.

Ova opcija sama ne potvrđuje namenu adrese: opšti kontakt mora biti povezan sa slanjem izbornog zahteva u službenom obaveštenju. Raniji nalaz bez primaoca ili sa običnim kontaktom nije trajna presuda o toj misiji. Svaki prolaz i dalje čuva nepromenljive artefakte dokaza i snimke izvora u svom `runId` direktorijumu. Paket-only prolaz ne vrši pregled, `--apply` ni promociju i ne menja `data/overrides.json`; za automatsku promociju kandidata i dalje su potrebni redovan primarni pregled, a zatim zaseban, izričit `--apply`. Izričito autorizovana operatorska izmena je zaseban održavani put opisan ispod.

## Ciljani duboki ponovni prolaz

Za stanice čiji je raniji prolaz dosegao ograničenje dubine ili je neuspeo, koristite isključivo sledeći ograničeni ponovni prolaz:

```bash
bun run contacts:run -- --election-id 2026-parliamentary --mode deep-retry \
  --station st-nonres-af \
  --station st-bg-emb-main \
  --station st-de-cons-tutgart \
  --station st-il-emb-main \
  --station st-ir-emb-main \
  --station st-lv-emb-main-stockholm-mfa-gov-rs \
  --station st-nonres-pk \
  --station st-se-emb-main
```

`--mode deep-retry` zahteva najmanje jednu izričito navedenu `--station`; ne prihvata neograničen skup stanica. Za svaku tako izabranu stanicu dubina je fiksno 6, a budžet je podrazumevano ograničen na 240 stranica kada se izostavi `--max-pages`; pozivaoci mogu navesti drugačije pozitivno ograničenje broja stranica unutar dopuštenih granica. Opseg se čuva kroz sve naredne faze: ovaj prolaz ne proširuje skup na druge stanice, ne zaobilazi ograničenje stranica i nije automatsko potpuno osvežavanje.

Svako izvršavanje dobija nov `runId` i sopstvene nepromenljive artefakte; ne prepisivati niti ručno menjati ranije artefakte. Ovaj ponovni prolaz samo prikuplja i izvozi dokaz u svom izričitom opsegu: ne daje direktnu autorizaciju i ne pokreće promociju. Pregled i `--apply` ostaju zasebne, izričite odluke prema postupku ispod.

Za bilo koju stanicu, nepodržani medij koji je izričito potreban kao ciljani dokaz ostaje neuspešna akvizicija dok se javni sadržaj iz tog izvora ne može pribaviti; režim dubokog ponavljanja ga ne može premostiti. Veze ka samo otkrivenim prilozima ne preuzimaju se automatski.

## AI pregled i autorizacija

Kandidat može biti promovisan samo uz **jedan stvaran, dovršen primarni AI pregled** po politici `data/election_reviewers.json`. Prihvaćeni pregled mora vezati kandidata, skup kandidata za stanicu, izvor i tačne javne citate za tri stvari: aktuelni izbor, adresu za prijavu i identitet stanice. Paket i pregled sadrže stvarni identitet/odgovor poziva kada je dostupan; ne upisivati niti prepisivati ime modela koje nije stvarno prijavljeno.

Ovo pravilo važi za automatsku promociju novih kandidata. Postojeći strukturisani operator-approved put ostaje zaseban. Model treba da tumači celo obaveštenje: izborni naslov i uputstvo za slanje zahteva zajedno mogu potvrditi namenu običnog konzularnog sandučeta. Za spoljašnji harness koristiti ista pravila procene iz [AGENTS.md](../AGENTS.md) i sistemskog prompta u `request_review` u `scripts/review_election_candidates.py`; sam izvezeni paket ne sadrži taj prompt. Ne zahtevati novu izjavu o svakoj pokrivenoj državi u izbornom obaveštenju ako službena veza MSP već utvrđuje nadležnost. Ako ta veza nedostaje u AI paketu, prijaviti nedostajući dokaz u paketu, a ne proglasiti državu nepokrivenom.

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

AI pregled i primena su odvojene radnje. Najpre završite stvarni pregled ili uvezite stvarno prikupljeni, potvrđeni harness artefakt bez `--apply`. Tek zatim, u zasebnom izričitom prolazu, pokrenite primenu:

```bash
bun run contacts:run -- --election-id 2026-parliamentary --apply
```

Pre pisanja, tok uvek pravi novi dry-run. Sa `--apply` bira **samo** `eligibleStationIds` iz tog dry-runa i šalje ih promociji kao eksplicitne stanice. Zadržane stanice (`held`) ostaju nepromenjene, a ako bilo koja izabrana grupa više nije validna promocija se prekida bez delimičnog upisa. `--apply` bez ranije stvarnog pregleda ili potvrđenog `--import-reviews` se odbija. Tok nikada ne izmišlja pregled, ne premošćava neuspelu raniju fazu i ne menja override pri samom izvozu paketa.

Trajni override čuva postojeće, nevezane ključeve. Svaki korisnički autorizovan primalac ima strukturisano poreklo `_electionContactProvenance` sa `schemaVersion: 2`, `authorization: {"type":"operator"}`, `electionId` i godinom izbora, bez izmišljenih AI polja. Njegov javni status je `electionContactApproval: "operator-approved"`: upotrebljiv je izborni primalac i računa se u pokrivenost. Uži boolean `isElectionContactConfirmed` ostaje false i ne sme se tumačiti kao `unconfirmed`. To važi i za meksički primalac iz održavanog handoff-a; nije poseban process-only izuzetak. Automatska promocija zadržava svaku zamenu operatorove autorizacije dok arhitekta izričito ne prihvati tu zamenu; to nije zahtev za dodatno AI odobrenje izričite operatorove izmene održavanih podataka. Staro ljudsko odobrenje i postojeća potvrda ostaju arhivirani; novi izvor dobija AI autorizaciju i njen javni dokaz. Eksplicitna deaktivacija ostaje poseban postupak promocionog alata i inkrementalno otkrivanje je ne poništava. Za povlačenje ili snižavanje objavljene pokrivenosti važi obavezno pravilo iz AGENTS.md.

Ako MSP adresar svrsta ustanovu koja nije diplomatska ili konzularna misija u odeljak ambasade, sačuvati sirovi scrape i dodati dokumentovani `_excludeFromPublic: true` override njenom stabilnom ID-ju. Builder proverava da ID zaista postoji, pa zatim uklanja taj red pre razrešavanja pokrivanja. Ovo je uska korekcija klasifikacije izvora, ne način za skrivanje nerešene misije. Trenutni primer su `st-fr-emb-main-info` i `st-nonres-mc-info`, izvedeni iz Srpskog kulturnog centra u Parizu (`info@ccserbie.com`); pravi Paris/Monako zapisi ostaju u skupu.

## Nerezidentne stanice i službeno pokrivanje MSP

Službene činjenice da jedna misija pokriva nerezidentnu stanicu vode se isključivo u `data/official_coverage_relationships.json`. Datoteka ima `schemaVersion: 1`; svaka veza sadrži `coveredStationId`, `coveringStationId`, konačni `electionEmail`, `approval: "operator-approved"` i poreklo `{"kind":"ministry-coverage"}`. To su odnosi koje je objavilo MSP, a ne lokalni ili lični override-i.

Pre izgradnje javnih podataka proverava se da je svaki `coveredStationId` jedinstven, da oba ID-ja postoje, da je `coveringStationId` rezidentna misija, da je `electionEmail` važeća e-adresa, da je `approval` poznata vrednost i da `coveredStationId` nije jednak `coveringStationId`. Neispravna ili dvosmislena službena veza prekida izgradnju; ne popravlja se nagađanjem.

Za nerezidentnu stanicu redosled razrešavanja je strogo sledeći:

1. izričiti `electionEmail` override na samoj nerezidentnoj stanici;
2. službena veza iz `official_coverage_relationships.json`;
3. tačno automatsko podudaranje domaćina i osnovne e-adrese;
4. inače nerešen sirovi zapis.

Službena veza projektuje javni identitet pokrivajuće misije — naziv, sajt i adresu — postavlja javni `coveringStationId`, a kao izborni primalac koristi `electionEmail`, `approval` i poreklo iz te veze. Izvorna e-adresa nerezidentnog zapisa ostaje sačuvana u `coverageSourceEmail` samo radi revizijskog porekla. Override-i pokrivajuće rezidentne misije primenjuju se pre te projekcije. Izričiti `electionEmail` override ili njegovo poreklo na nerezidentnoj stanici i dalje imaju prednost nad službenom vezom.

Službena veza čuva sopstvenu adresu i odobrenje; kasnija promena rezidentnog primaoca ne menja ih automatski. Pri promeni pokrivajuće misije pregledati sve zavisne države, uključujući ove veze i njihove sopstvene override-e. Poreklo `ministry-coverage` označava vrstu održavanog zapisa; za novu vezu sačuvati stvarni službeni URL/dokaz u opisu izmene ili handoff-u.

Podudaranje samo po domaćinu nikada nije pokrivanje. Automatsko razrešavanje je dopušteno samo kada se istovremeno tačno podudaraju kanonski domaćin i osnovna e-adresa; sličan domaćin, ista domena ili samo podudarna e-adresa ostavljaju zapis nerešenim. Službena veza je pravilo izbora i prikaza odobrenog primaoca, a ne automatski dokaz da je kontakt izborni.

Ručno polje `_coverageStationId` više nije dopušteno ni u jednom override-u. Izgradnja odbija svaki njegov budući unos; službenu vezu dodati ili ispraviti u `official_coverage_relationships.json` uz navedeno poreklo MSP, nikada u override-u.

## Izgradnja podataka i zasebno objavljivanje

Posle uspešnog `--apply` ili autorizovane izmene održavanih podataka, u radnoj kopiji ponovo izgradite podatke koje koristi frontend:

```bash
bun run build:data
```

Pre `bun run build` / Firebase objavljivanja obavezno izvršiti semantičko poređenje sa poslednjim stvarno objavljenim skupom prema [AGENTS.md](../AGENTS.md): adresa i nivo odobrenja po stabilnom ID-ju, uklonjene stanice, sve nerezidentne stanice i ukupan broj upotrebljivih primalaca. Uspešan build/test nije dokaz ovog poređenja; lokalni `master` nije sam po sebi potvrđen produkcioni baseline. Ako baseline nedostaje, završiti lokalni rad ali ne objavljivati.

Zatim proverite i sastavite lokalno izdanje:

```bash
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
