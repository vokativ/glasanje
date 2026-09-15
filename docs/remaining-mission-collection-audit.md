# Remaining mission collection audit — 12 September 2026 UTC

Scope: 62 unconfirmed resident-directory entries, excluding Paris, Yerevan and Nairobi and their duplicate entries. Existing approved recipients are preserved.

This document records the 12 September snapshot. Later notices and approvals, including Jakarta, Paris, Nairobi, Beirut and Bratislava, are recorded in the [missing-recipient recheck](missing-recipient-recheck-2026-09-14.md); its later findings supersede “no current notice found” rows below.

## Directly reviewed and operator-approved recipients

These 17 recipients were read in current official election notices and explicitly approved by the maintainer in this conversation on 12 September UTC (13 September local time). They move from `unconfirmed` to `operator-approved`, with honest schema-version-2 operator provenance. No AI invocation or automatic confirmation was fabricated. Ordinary mailboxes already named by the notice are retained.

| Mission | Station ID | Approved recipient | Official notice |
| --- | --- | --- | --- |
| Salzburg | `st-at-cons-salcburg` | `izbori.salzburg2026@mfa.rs` | [Announcement](https://salzburg.mfa.gov.rs/gradjani/najcesca-pitanja) |
| Banja Luka | `st-ba-cons-banjaluka` | `banjaluka2026@mfa.rs` | [Announcement](https://banjaluka.mfa.gov.rs/mediji/aktivnosti/konkurs-za-sufinansiranje-projekata-za-oblasti-skole-manifestacije-i-status) |
| Trebinje | `st-ba-cons-trebinje` | `kktrebinje2026@mfa.rs` | [Announcement](https://banjaluka.mfa.gov.rs/mediji/aktivnosti/konkurs-za-sufinansiranje-projekata-za-oblasti-skole-manifestacije-i-status) |
| Mostar | `st-ba-cons-mostar` | `gk.mostar@mfa.rs` | [Announcement](https://mostar.mfa.gov.rs/mediji/najave-i-obavestenja/odluka-o-raspisivanju-izbora-za-narodne-poslanike) |
| Sofia | `st-bg-emb-main` | `izbori.sofija@mfa.rs` | [Announcement](https://sofia.mfa.gov.rs/press-service/announcements-and-notifications/raspisivanje-izbora-za-narodne-poslanike) |
| Trieste | `st-it-cons-trst` | `izboritrst@gmail.com` | [Announcement](https://trieste.mfa.gov.rs/mediji/aktivnosti/razgovor-konzula-zerana-paunovica-sa-prefektom-i-kvestorom-udina) |
| Doha | `st-qa-emb-main` | `izbori.ambrs.doha@gmail.com` | [Announcement](https://doha.mfa.gov.rs/mediji/aktivnosti/prijava-za-glasanje-na-parlamentarnim-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine) |
| Shanghai | `st-cn-cons-angaj` | `srb.cons.shanghai@mfa.rs` | [Announcement](https://shanghai.mfa.gov.rs/mediji/najave-i-obavestenja/parlamentarni-izbori-2026) |
| Nicosia | `st-cy-emb-main` | `izbori.nikozija@mfa.rs` | [Announcement](https://nicosia.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| Lisbon | `st-pt-emb-main` | `serviaemba@netcabo.pt` | [Announcement](https://lisbon.mfa.gov.rs/mediji/aktivnosti/obavestenje-o-prijavi-za-glasanje-u-inostranstvu) |
| Bucharest | `st-ro-emb-main` | `consulate.bucharest@mfa.rs` | [Announcement](https://bucharest.mfa.gov.rs/mediji/najave-i-obavestenja/parlamentarni-izbori-25-10-2026-godine) |
| Moscow | `st-ru-emb-main` | `konzularno.moskva@mfa.rs` | [Announcement](https://moskva.mfa.gov.rs/mediji/aktivnosti/parlamentarni-izbori-u-republici-srbiji-25-oktobar-2026-godine) |
| Ljubljana | `st-si-emb-main` | `embassy.ljubljana@mfa.rs` | [Announcement](https://ljubljana.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-25-10-2026-prijavljivanje-za-glasanje-u-inostranstvu) |
| Zagreb | `st-hr-emb-main` | `konzularno.zagreb@mfa.rs` | [Announcement](https://zagreb.mfa.gov.rs/mediji/aktivnosti/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| Rijeka | `st-hr-cons-rijeka` | `izboririjeka2026@gmail.com` | [Announcement](https://rijeka.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| Podgorica | `st-me-emb-main` | `embassy.podgorica@mfa.rs` | [Announcement](https://podgorica.mfa.gov.rs/mediji/aktivnosti/saopstenje-za-javnost-izbori-u-republici-srbiji) |
| Prague | `st-cz-emb-main` | `konzularno.prag@mfa.rs` | [Announcement](https://prague.mfa.gov.rs/mediji/najave-i-obavestenja/prijava-za-glasanje-na-parlamentarnim-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine) |

Rijeka says requests may be sent by email and supplies the election mailbox later in the same notice. Shanghai has an earlier copied reference to Skopje, but its operative submission instructions explicitly name Shanghai, its street address and the mailbox above. Banja Luka’s shared notice separately identifies the Trebinje office and its recipient. The MFA identifies Drvar as a consular office of the General Consulate in Mostar and assigns it the Mostar website. That site’s notice directs Serbian citizens residing in Bosnia and Herzegovina to submit to `gk.mostar@mfa.rs`; the maintainer confirmed on 15 September that this shared recipient counts for Drvar.

## Collection and limitations

Three completed collection runs fetched 845 pages in total (including repeated source checks):

| Run | Scope | Pages | Outcome |
| --- | --- | ---: | --- |
| `20260912T191951Z-34df7439ff96` | 62 selected entries; full mode | 481 | Initial collection; directory-link failures and depth limits examined below. |
| `20260912T193244Z-db71f679dc70` | 30 sites without a current homepage notice; deep retry | 333 | No additional current notice found; four historical-pagination depth limits, Astana directory-link failure and Strasbourg HTTP 403. |
| `20260912T193817Z-ef266e36b828` | Six targeted notices plus Astana after the HTTP-link fix | 31 | All selected acquisitions completed; no fetch failures or limits. Astana had no current election evidence. |

All 54 known mission homepages were additionally fetched and inspected. The 23 distinct current notices linked from them were read in full. Six notices had no mailbox in their body: Brasilia, Tripoli, Tunis, Ankara, Istanbul and Vukovar. Their rendered images were inspected (flags, logos or election illustrations, no mailbox); all nine linked Word attachments were downloaded and read. Those attachments are generic forms without a recipient. Their notice links are published, and their recipients remain unconfirmed. This is a finding about these inspected materials, not a declaration that no email could ever be published.

The remaining bounded-crawl depth limits are Buenos Aires, Athens, Budapest and Bratislava. Their homepages/current listings and targeted current-election searches were also checked without finding a current notice. Strasbourg’s homepage opened, but its `/mediji/aktuelnosti` endpoint returned HTTP 403. Keep these specific limitations; do not change their status to `not-published`. Baghdad’s discovered registration notices concerned 2022 and were not used for 2026.

The first targeted attempt (`20260912T193802Z-2d5db24e5d76`) stopped before acquisition because one notice URL was bound to both Banja Luka and Trebinje. The current targeted CLI requires a single station binding per URL per run. The successful retry targeted Banja Luka; the shared page was directly read for both offices, and both maintained notice pointers and distinct approved mailboxes are present. If automated packets are needed for both offices later, use separate targeted runs. No immutable run artifact was edited.

## Concrete process findings

- MFA’s Austria, Montenegro and Kazakhstan directories use HTTP mission hrefs, even when the labels say HTTPS. `linked_mission_tasks` now upgrades only a linked, known mission host to HTTPS. Acquisition and redirects remain HTTPS-only, with existing host checks. The real follow-up run successfully established all three mission chains.
- Mostar displays `gk.mostar@mfa.rs` but its HTML mailto target is `konzularno@srbija.com.mk`. Rijeka displays `izboririjeka2026@gmail.com` but links to `izboririjeka2026@gmial.com`. The parser correctly holds those mismatches; the explicitly approved maintained recipients use the visible addresses.
- Banja Luka and Trieste publish genuine election notices under unrelated-looking old article slugs. Salzburg, like Vienna, uses the FAQ path. Page titles, navigation labels and actual instructions determine relevance.
- Lazy-loaded notice images can live in `<picture><source data-srcset>` while `<img src>` contains only a one-pixel placeholder. Inspect the rendered `currentSrc`; a placeholder is not evidence that the notice contains no real image.
- Several pending automatic candidates are alternate ordinary mailboxes from already approved notices. They remain in the candidate ledger for traceability; they do not revoke or replace the operator-approved recipients. The collection tool’s dry-run review holds are not public approval state.

## Directory clarifications

Latvia’s [MFA mission directory](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/letonija/ambasade-konzulati) lists a resident embassy contact but explicitly assigns consular matters to the embassy in Sweden. The maintainer confirmed this relationship. Both existing Latvian station IDs are preserved and corrected to resolve to `st-se-emb-main`, with `izbori.se@mfa.rs`, Sweden’s existing operator approval and announcement link. The original two contact strings remain as `coverageSourceEmail`. The builder now preserves that provenance when an existing resident-directory entry is corrected to consular coverage abroad.

Zimbabwe has no mission website. The maintainer supplied [the mission’s X account](https://x.com/SRBinZimbabwe) and stated it contains no election announcement. This is recorded as the maintainer’s finding, not an independently inspected X feed. Do not use the conflicting old Pretoria reference on the bilateral overview to overwrite the Harare contact.

Bahrain’s MFA bilateral page links `www.bahrain.mfa.gov.rs`, but both that hostname and its non-www variant failed DNS. Chile, Ghana and Venezuela had no mission website in the dataset or in the inspected MFA bilateral pages. No election recipient was established for them. Their existing public contacts are preserved. Baku’s pre-existing malformed general-contact string was not promoted to an election recipient.

## All selected entries

“No current notice found” means the bounded checks did not find one; it is not the maintained `not-published` state reserved for an explicit absence decision. Of the 62 selected entries, 19 now have usable recipients (17 approvals plus two Latvian coverage entries), and 43 remain unconfirmed.

| Station ID | Mission | Result | Source checked |
| --- | --- | --- | --- |
| `st-al-emb-main` | Ambasada Republike Srbije (Albanija) | No current notice found | [Source](https://tirana.mfa.gov.rs) |
| `st-ao-emb-main` | Ambasada Republike Srbije (Angola) | No current notice found | [Source](https://luanda.mfa.gov.rs) |
| `st-ar-emb-main` | Ambasada Republike Srbije (Argentina) | No current notice found | [Source](https://buenosaires.mfa.gov.rs) |
| `st-at-cons-salcburg` | Generalni konzulat Republike Srbije (Salcburg) | Operator-approved recipient | [Source](https://salzburg.mfa.gov.rs/gradjani/najcesca-pitanja) |
| `st-az-emb-main` | Ambasada Republike Srbije (Azerbejdžan) | No current notice found | [Source](https://baku.mfa.gov.rs) |
| `st-ba-cons-banjaluka` | Generalni konzulat Republike Srbije (Banja Luka) | Operator-approved recipient | [Source](https://banjaluka.mfa.gov.rs/mediji/aktivnosti/konkurs-za-sufinansiranje-projekata-za-oblasti-skole-manifestacije-i-status) |
| `st-ba-cons-drvar` | Generalni konzulat Republike Srbije (Drvar) | Shared Mostar recipient approved: `gk.mostar@mfa.rs`; MFA lists Drvar as Mostar’s consular office and the notice addresses residents throughout Bosnia and Herzegovina | [Source](https://mostar.mfa.gov.rs/mediji/najave-i-obavestenja/odluka-o-raspisivanju-izbora-za-narodne-poslanike) |
| `st-ba-cons-mostar` | Generalni konzulat Republike Srbije (Mostar) | Operator-approved recipient | [Source](https://mostar.mfa.gov.rs/mediji/najave-i-obavestenja/odluka-o-raspisivanju-izbora-za-narodne-poslanike) |
| `st-ba-cons-trebinje` | Generalni konzulat Republike Srbije (Trebinje) | Operator-approved recipient | [Source](https://banjaluka.mfa.gov.rs/mediji/aktivnosti/konkurs-za-sufinansiranje-projekata-za-oblasti-skole-manifestacije-i-status) |
| `st-ba-emb-main` | Ambasada Republike Srbije (Bosna i Hercegovina) | No current notice found | [Source](https://sarajevo.mfa.gov.rs) |
| `st-bg-emb-main` | Ambasada Republike Srbije (Bugarska) | Operator-approved recipient | [Source](https://sofia.mfa.gov.rs/press-service/announcements-and-notifications/raspisivanje-izbora-za-narodne-poslanike) |
| `st-bh-emb-main` | Ambasada Republike Srbije (Bahrein) | No available mission website; contact remains unconfirmed | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/bahrein) |
| `st-br-emb-main` | Ambasada Republike Srbije (Brazil) | Current notice; no recipient established | [Source](https://brasilia.mfa.gov.rs/mediji/aktivnosti/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-cd-emb-main` | Ambasada Republike Srbije (Demokratska Republika Kongo) | No current notice found | [Source](https://kinshasa.mfa.gov.rs) |
| `st-ch-cons-cirih` | Generalni konzulat Republike Srbije (Cirih) | No current notice found | [Source](https://www.zurich.mfa.gov.rs) |
| `st-cl-emb-main` | Ambasada Republike Srbije (Čile) | No available mission website; contact remains unconfirmed | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/cile) |
| `st-cn-cons-angaj` | Generalni konzulat Republike Srbije (Šangaj) | Operator-approved recipient | [Source](https://shanghai.mfa.gov.rs/mediji/najave-i-obavestenja/parlamentarni-izbori-2026) |
| `st-cu-emb-main` | Ambasada Republike Srbije (Kuba) | No current notice found | [Source](https://havana.mfa.gov.rs) |
| `st-cy-emb-main` | Ambasada Republike Srbije (Kipar) | Operator-approved recipient | [Source](https://nicosia.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-cz-emb-main` | Ambasada Republike Srbije (Češka) | Operator-approved recipient | [Source](https://prague.mfa.gov.rs/mediji/najave-i-obavestenja/prijava-za-glasanje-na-parlamentarnim-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine) |
| `st-eg-emb-main` | Ambasada Republike Srbije (Egipat) | No current notice found | [Source](https://cairo.mfa.gov.rs) |
| `st-et-emb-main` | Ambasada Republike Srbije (Etiopija) | No current notice found | [Source](https://addisababa.mfa.gov.rs) |
| `st-fr-cons-strazbur` | Generalni konzulat Republike Srbije (Strazbur) | No current notice found | [Source](https://www.strasbourg.mfa.gov.rs) |
| `st-gh-emb-main` | Ambasada Republike Srbije (Gana) | No available mission website; contact remains unconfirmed | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/gana) |
| `st-gr-cons-solun` | Generalni konzulat Republike Srbije (Solun) | No current notice found | [Source](https://www.thessaloniki.mfa.gov.rs) |
| `st-gr-emb-main` | Ambasada Republike Srbije (Grčka) | No current notice found | [Source](https://athens.mfa.gov.rs) |
| `st-hr-cons-rijeka` | Generalni konzulat Republike Srbije (Rijeka) | Operator-approved recipient | [Source](https://rijeka.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-hr-cons-vukovar` | Generalni konzulat Republike Srbije (Vukovar) | Current notice; no recipient established | [Source](https://vukovar.mfa.gov.rs/mediji/najave-i-obavestenja/obavestenje-izbori-za-narodne-poslanike) |
| `st-hr-emb-main` | Ambasada Republike Srbije (Hrvatska) | Operator-approved recipient | [Source](https://zagreb.mfa.gov.rs/mediji/aktivnosti/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-hu-emb-main` | Ambasada Republike Srbije (Mađarska) | No current notice found | [Source](https://www.budapest.mfa.gov.rs) |
| `st-id-emb-main` | Ambasada Republike Srbije (Indonezija) | No current notice found | [Source](https://jakarta.mfa.gov.rs) |
| `st-in-emb-main` | Ambasada Republike Srbije (Indija) | No current notice found | [Source](https://newdelhi.mfa.gov.rs) |
| `st-iq-emb-main` | Ambasada Republike Srbije (Irak) | No current notice found | [Source](https://baghdad.mfa.gov.rs) |
| `st-ir-emb-main` | Ambasada Republike Srbije (Iran) | No current notice found | [Source](https://tehran.mfa.gov.rs) |
| `st-it-cons-trst` | Generalni konzulat Republike Srbije (Trst) | Operator-approved recipient | [Source](https://trieste.mfa.gov.rs/mediji/aktivnosti/razgovor-konzula-zerana-paunovica-sa-prefektom-i-kvestorom-udina) |
| `st-kw-emb-main` | Ambasada Republike Srbije (Kuvajt) | No current notice found | [Source](https://kuwait.mfa.gov.rs) |
| `st-kz-emb-main` | Ambasada Republike Srbije (Kazahstan) | No current notice found | [Source](https://astana.mfa.gov.rs) |
| `st-lb-emb-main` | Ambasada Republike Srbije (Liban) | No current notice found | [Source](https://beirut.mfa.gov.rs) |
| `st-lv-emb-main-srb-emb-latvia` | Ambasada Republike Srbije (Letonija) | Sweden consular coverage; existing approved recipient | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/letonija/ambasade-konzulati) |
| `st-lv-emb-main-stockholm-mfa-gov-rs` | Ambasada Republike Srbije (Letonija) | Sweden consular coverage; existing approved recipient | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/letonija/ambasade-konzulati) |
| `st-ly-emb-main` | Ambasada Republike Srbije (Libija) | Current notice; no recipient established | [Source](https://tripoli.mfa.gov.rs/mediji/aktivnosti/obavestenje-za-drzavljane-republike-srbije-koji-borave-u-drzavi-libiji-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra-2026) |
| `st-ma-emb-main` | Ambasada Republike Srbije (Maroko) | No current notice found | [Source](https://rabat.mfa.gov.rs) |
| `st-me-cons-hercegnovi` | Generalni konzulat Republike Srbije (Herceg Novi) | No current notice found | [Source](https://hercegnovi.mfa.gov.rs) |
| `st-me-emb-main` | Ambasada Republike Srbije (Crna Gora) | Operator-approved recipient | [Source](https://podgorica.mfa.gov.rs/mediji/aktivnosti/saopstenje-za-javnost-izbori-u-republici-srbiji) |
| `st-mm-emb-main` | Ambasada Republike Srbije (Mjanmar) | No current notice found | [Source](https://yangon.mfa.gov.rs) |
| `st-ng-emb-main` | Ambasada Republike Srbije (Nigerija) | No current notice found | [Source](https://abuja.mfa.gov.rs) |
| `st-pt-emb-main` | Ambasada Republike Srbije (Portugalija) | Operator-approved recipient | [Source](https://lisbon.mfa.gov.rs/mediji/aktivnosti/obavestenje-o-prijavi-za-glasanje-u-inostranstvu) |
| `st-qa-emb-main` | Ambasada Republike Srbije (Katar) | Operator-approved recipient | [Source](https://doha.mfa.gov.rs/mediji/aktivnosti/prijava-za-glasanje-na-parlamentarnim-izborima-koji-ce-biti-odrzani-25-oktobra-2026-godine) |
| `st-ro-emb-main` | Ambasada Republike Srbije (Rumunija) | Operator-approved recipient | [Source](https://bucharest.mfa.gov.rs/mediji/najave-i-obavestenja/parlamentarni-izbori-25-10-2026-godine) |
| `st-ru-emb-main` | Ambasada Republike Srbije (Rusija) | Operator-approved recipient | [Source](https://moskva.mfa.gov.rs/mediji/aktivnosti/parlamentarni-izbori-u-republici-srbiji-25-oktobar-2026-godine) |
| `st-sa-emb-main` | Ambasada Republike Srbije (Saudijska Arabija) | No current notice found | [Source](https://riyadh.mfa.gov.rs) |
| `st-si-emb-main` | Ambasada Republike Srbije (Slovenija) | Operator-approved recipient | [Source](https://ljubljana.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-25-10-2026-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-sk-emb-main` | Ambasada Republike Srbije (Slovačka) | No current notice found | [Source](https://www.bratislava.mfa.gov.rs) |
| `st-sy-emb-main` | Ambasada Republike Srbije (Sirija) | No current notice found | [Source](https://damascus.mfa.gov.rs) |
| `st-tn-emb-main` | Ambasada Republike Srbije (Tunis) | Current notice; no recipient established | [Source](https://tunis.mfa.gov.rs/mediji/aktivnosti/obavestenje-za-drzavljane-republike-srbije-koji-borave-u-republici-tunis-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra) |
| `st-tr-cons-istanbul` | Generalni konzulat Republike Srbije (Istanbul) | Current notice; no recipient established | [Source](https://istanbul.mfa.gov.rs/mediji/aktivnosti/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-tr-emb-main` | Ambasada Republike Srbije (Turska) | Current notice; no recipient established | [Source](https://ankara.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| `st-ua-emb-main` | Ambasada Republike Srbije (Ukrajina) | No current notice found | [Source](https://kiev.mfa.gov.rs) |
| `st-va-emb-main` | Ambasada Republike Srbije (Vatikan) | No current notice found | [Source](https://vatican.mfa.gov.rs) |
| `st-ve-emb-main` | Ambasada Republike Srbije (Venecuela) | No available mission website; contact remains unconfirmed | [Source](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/venecuela) |
| `st-zm-emb-main` | Ambasada Republike Srbije (Zambija) | No current notice found | [Source](https://lusaka.mfa.gov.rs) |
| `st-zw-emb-main` | Ambasada Republike Srbije (Zimbabve) | No website; no election mention on X per maintainer | [Source](https://x.com/SRBinZimbabwe) |

## Deployment coverage gate

Baseline: the live [Firebase website](https://korak-do-glasa-hosting-2026.web.app/), fetched 12 September 2026 at 19:19:52 UTC, with published asset `assets/index-CHapPpdJ.js`. Its bundle was parsed as JavaScript data without execution; SHA-256: `f3c6e3067b11c5d859dac8ba233ff5dddad9cca4722841cca480831ef356450c`. All 223 station IDs were compared individually with regenerated output, including email, approval, removed IDs and resolved non-resident coverage.

The usable count increases **101 → 126** (34 source-confirmed, 92 operator-approved). All 223 station IDs remain. There are no empty-recipient replacements and no approval downgrades. The 17 approved missions add six previously unconfirmed dependent entries: Cape Verde, Moldova, Kyrgyzstan, Tajikistan, Turkmenistan and Uzbekistan. Latvia adds two maintained entries. Explicit relationships and non-resident overrides were inspected; no existing approved country loses coverage.

The website now exposes 122 notice links, including links for 115 of the 126 approved entries. The same 11 approved entries behind Paris, Nairobi and Yerevan retain the explicitly recorded absence of an announcement. Those excluded missions were not recrawled.

Every changed public recipient/approval is listed below. Replacements use the source-linked instructions above; Latvia uses the explicit MFA consular relationship. Unchanged emails are shown to make approval-only changes clear.

| Station ID | Old email | New email | Approval |
| --- | --- | --- | --- |
| `st-at-cons-salcburg` | `genconsulate.salzburg@mfa.rs` | `izbori.salzburg2026@mfa.rs` | unconfirmed → operator-approved |
| `st-ba-cons-trebinje` | `kk.trebinje@mfa.rs` | `kktrebinje2026@mfa.rs` | unconfirmed → operator-approved |
| `st-ba-cons-mostar` | `gk.mostar@mfa.rs` | `gk.mostar@mfa.rs` | unconfirmed → operator-approved |
| `st-ba-cons-banjaluka` | `konzulat.bl@mfa.rs` | `banjaluka2026@mfa.rs` | unconfirmed → operator-approved |
| `st-bg-emb-main` | `srb.emb.bulgaria@mfa.rs` | `izbori.sofija@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-cv` | `serviaemba@netcabo.pt` | `serviaemba@netcabo.pt` | unconfirmed → operator-approved |
| `st-it-cons-trst` | `gkrstrst@spin.it` | `izboritrst@gmail.com` | unconfirmed → operator-approved |
| `st-qa-emb-main` | `srb.emb.qatar@mfa.rs` | `izbori.ambrs.doha@gmail.com` | unconfirmed → operator-approved |
| `st-cn-cons-angaj` | `srb.cons.shanghai@mfa.rs` | `srb.cons.shanghai@mfa.rs` | unconfirmed → operator-approved |
| `st-cy-emb-main` | `nicosia@serbia.org.cy` | `izbori.nikozija@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-kg` | `konzularno.moskva@mfa.rs` | `konzularno.moskva@mfa.rs` | unconfirmed → operator-approved |
| `st-lv-emb-main-srb-emb-latvia` | `srb.emb.latvia@mfa.rs` | `izbori.se@mfa.rs` | unconfirmed → operator-approved |
| `st-lv-emb-main-stockholm-mfa-gov-rs` | `srb.emb.sweden@mfa.rs` | `izbori.se@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-md` | `consulate.bucharest@mfa.rs` | `consulate.bucharest@mfa.rs` | unconfirmed → operator-approved |
| `st-pt-emb-main` | `serviaemba@netcabo.pt` | `serviaemba@netcabo.pt` | unconfirmed → operator-approved |
| `st-ro-emb-main` | `consulate.bucharest@mfa.rs` | `consulate.bucharest@mfa.rs` | unconfirmed → operator-approved |
| `st-ru-emb-main` | `konzularno.moskva@mfa.rs` | `konzularno.moskva@mfa.rs` | unconfirmed → operator-approved |
| `st-si-emb-main` | `embassy.ljubljana@mfa.rs` | `embassy.ljubljana@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-tj` | `konzularno.moskva@mfa.rs` | `konzularno.moskva@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-tm` | `konzularno.moskva@mfa.rs` | `konzularno.moskva@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-uz` | `konzularno.moskva@mfa.rs` | `konzularno.moskva@mfa.rs` | unconfirmed → operator-approved |
| `st-hr-emb-main` | `konzularno.zagreb@mfa.rs` | `konzularno.zagreb@mfa.rs` | unconfirmed → operator-approved |
| `st-hr-cons-rijeka` | `konzulat.srbije.rijeka@gmail.com` | `izboririjeka2026@gmail.com` | unconfirmed → operator-approved |
| `st-me-emb-main` | `embassy.podgorica@mfa.rs` | `embassy.podgorica@mfa.rs` | unconfirmed → operator-approved |
| `st-cz-emb-main` | `embassy.prague@mfa.rs` | `konzularno.prag@mfa.rs` | unconfirmed → operator-approved |

## Verification and follow-up

`bun run build:data`, 87 Python tests, `bun run check`, 63 Bun tests and the production build passed. Production-preview browser checks verified the notice links for Austria, Bosnia and Herzegovina, Bulgaria, Brazil, Latvia and Croatia; retained absence messages for Monaco, Georgia and Uganda; and desktop/mobile layout without horizontal overflow. The submission-screen confirmation link remains covered by the application test suite.

The deferred idea of internally archiving directly inspected announcements remains in [the earlier approved-link audit](approved-announcement-link-audit.md). This pass adds maintained public pointers and uses the existing crawler artifacts; it does not add an archive service or OCR platform.

Deployment completed and live output was verified at Sat, 12 Sep 2026 19:43:54 GMT. Live HTML and `/assets/index-BS5Fy9va.js` match the production build byte-for-byte, and all public station fields match the generated dataset. Release bundle SHA-256: `e73ea08d57865ef3b2bb70337c606cbafba8e0f7c54e8d540a00b99b8a9a84fc`.
