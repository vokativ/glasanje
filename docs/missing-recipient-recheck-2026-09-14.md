# Missing-recipient recheck — 14 September 2026 local time

43 previously unconfirmed mission entries were selected, retaining the earlier exclusions for Paris, Yerevan and Nairobi. Live deployed baseline: 126 approved entries, asset `index-BS5Fy9va.js`, verified against the previous release snapshot.

## New recipient findings

The full current notice was read for each mission below. Each explicitly directs completed voter-registration requests and ID copies to the listed mailbox. The maintainer subsequently explicitly approved all four recipients and their existing resolved country coverage on 14 September 2026 local time. See the approval release below. The initial collection did not fabricate an automatic AI review.

| Mission | Station ID | Recipient | Official announcement |
| --- | --- | --- | --- |
| buenosaires | `st-ar-emb-main` | `consulado.argentina@mfa.rs` | [Избори 2026: Пријављивање за гласање у иностранству](https://buenosaires.mfa.gov.rs/mediji/aktivnosti/ambasador-lazic-predao-akreditivna-pisma-predsedniku-paragvaja) |
| sarajevo | `st-ba-emb-main` | `sarajevo2026@mfa.rs` | [ИЗБОРИ 2026 - Пријем захтева за гласање у иностранству](https://sarajevo.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-2026-prijem-zahteva-za-glasanje-u-inostranstvu) |
| cairo | `st-eg-emb-main` | `serbia@serbiaeg.com` | [Обавештење о изборима за народне посланике Народне скупштине Републике Србије](https://cairo.mfa.gov.rs/mediji/aktivnosti/obavestenje-o-izborima-za-narodne-poslanike-narodne-skupstine-republike-srbije) |
| rabat | `st-ma-emb-main` | `ambrsrabat@gmail.com` | [Обавештење о изборима за народне посланике Народне скупштине Републике Србије](https://rabat.mfa.gov.rs/mediji/aktivnosti/obavestenje-o-izborima-za-narodne-poslanike-narodne-skupstine-republike-srbije) |

## Source checks

All 38 available mission homepages were fetched successfully. Previously inspected notices for Brasilia, Tripoli, Tunis, Ankara, Istanbul and Vukovar have unchanged body text, image markup and attachment links. Their six image files and nine Word attachments were downloaded again and match the previously inspected bytes exactly. No new recipient was found in those materials. Mostar’s notice is also unchanged and does not establish a separate Drvar recipient.

Buenos Aires displays `consulado.argentina@mfa.rs` in its submission instructions but its `mailto:` points to the older `consuladoserbia@fibertel.com.ar`. The proposed recipient follows the displayed address, which is also the existing general contact; the stale link is not silently substituted. Sarajevo, Cairo and Rabat’s visible mailboxes agree with their mailto targets. Notice publication dates are 11, 10, 12 and 13 September respectively; these are newly found since the previous check, not all newly dated today.

The five entries without a mission website were checked against the MFA bilateral pages again. Bahrain’s listed website still fails DNS in both www and non-www forms. Chile, Ghana and Venezuela have no new mission link there. Zimbabwe’s old Pretoria reference is unchanged and does not supersede the maintainer’s Harare decision. A fresh fetch of https://x.com/SRBinZimbabwe returned HTTP 403, so changes to its X feed could not be checked. No absence or approval downgrade is inferred.

## Collection run

Run `20260913T160629Z-8d60eaf51d44` selected all 43 entries and fetched 268 pages. It retained current notices and exported three primary-review packets; none was automatically promoted. The run retains its actual depth/fetch limitations rather than claiming exhaustive absence.

| Selected station | Crawl outcome |
| --- | --- |
| `st-al-emb-main` | depth-limited |
| `st-ao-emb-main` | scanned-no-evidence |
| `st-ar-emb-main` | depth-limited |
| `st-az-emb-main` | scanned-no-evidence |
| `st-ba-cons-drvar` | depth-limited |
| `st-ba-emb-main` | depth-limited |
| `st-bh-emb-main` | no-site |
| `st-br-emb-main` | depth-limited |
| `st-cd-emb-main` | scanned-no-evidence |
| `st-ch-cons-cirih` | depth-limited |
| `st-cl-emb-main` | no-site |
| `st-cu-emb-main` | depth-limited |
| `st-eg-emb-main` | candidate |
| `st-et-emb-main` | scanned-no-evidence |
| `st-fr-cons-strazbur` | failed |
| `st-gh-emb-main` | no-site |
| `st-gr-cons-solun` | depth-limited |
| `st-gr-emb-main` | depth-limited |
| `st-hr-cons-vukovar` | depth-limited |
| `st-hu-emb-main` | depth-limited |
| `st-id-emb-main` | scanned-no-evidence |
| `st-in-emb-main` | scanned-no-evidence |
| `st-iq-emb-main` | scanned-no-evidence |
| `st-ir-emb-main` | depth-limited |
| `st-kw-emb-main` | depth-limited |
| `st-kz-emb-main` | depth-limited |
| `st-lb-emb-main` | scanned-no-evidence |
| `st-ly-emb-main` | scanned-no-evidence |
| `st-ma-emb-main` | depth-limited |
| `st-me-cons-hercegnovi` | depth-limited |
| `st-mm-emb-main` | scanned-no-evidence |
| `st-ng-emb-main` | scanned-no-evidence |
| `st-sa-emb-main` | scanned-no-evidence |
| `st-sk-emb-main` | depth-limited |
| `st-sy-emb-main` | scanned-no-evidence |
| `st-tn-emb-main` | depth-limited |
| `st-tr-cons-istanbul` | depth-limited |
| `st-tr-emb-main` | depth-limited |
| `st-ua-emb-main` | depth-limited |
| `st-va-emb-main` | depth-limited |
| `st-ve-emb-main` | no-site |
| `st-zm-emb-main` | scanned-no-evidence |
| `st-zw-emb-main` | no-site |

## Initial link-only publication and coverage

The four new maintained announcement links also reach ten existing covered-country entries: Bolivia, Ecuador, Paraguay, Peru and Uruguay (Buenos Aires); Oman, Palestine and Sudan (Cairo); Mauritania and Senegal (Rabat). In the initial link-only release, their recipient approvals remained unchanged while the explicit approval request was pending. That release did not replace any published mailbox. The subsequent approval release below selects Sarajevo’s published election recipient.

The verified live baseline was `https://korak-do-glasa-hosting-2026.web.app/assets/index-BS5Fy9va.js`, checked at Sun, 13 Sep 2026 16:07:16 GMT; SHA-256 `e73ea08d57865ef3b2bb70337c606cbafba8e0f7c54e8d540a00b99b8a9a84fc`. Comparison by all 223 stable IDs shows no email removal, replacement, approval downgrade or station deletion. Approved coverage remains **126 → 126**; public notice links increase **122 → 136**.

Validation passed: `bun run build:data`, 87 Python tests, `bun run check`, 63 Bun tests, and the production build. No application or crawler logic was changed for this data refresh. The normal build still reports its existing PDF dependency chunk-size warning.

Firebase deployment succeeded. Live HTML and `/assets/index-Dt5AAgH1.js` were verified byte-for-byte against the build at Sun, 13 Sep 2026 16:13:07 GMT. The parsed live country dataset matches every generated public field. Release bundle SHA-256: `245aa9240c4ac248ff5d4c60b2b7e2cb2b440a85c74541572c770f925f85cee3`.

## Operator-approved recipient release — 14 September 2026

The maintainer explicitly approved Buenos Aires (`consulado.argentina@mfa.rs`), Sarajevo (`sarajevo2026@mfa.rs`), Cairo (`serbia@serbiaeg.com`) and Rabat (`ambrsrabat@gmail.com`), including existing resolved coverage. All four now use structured schema-version-2 operator authorization, retaining the actual announcement URL, title and observation time. No automatic AI confirmation is claimed.

The approvals reach ten dependent entries listed above. Approved public coverage increases **126 → 140**. Sarajevo changes from its ordinary contact to the specifically published election mailbox; every other affected address is preserved. All 223 stable station IDs and all announcement links are retained. No recipient is removed and no approval is downgraded. Explicit coverage relationships and non-resident overrides were checked; the ten dependents resolve through the approved missions without additional pinned-address changes.

The live pre-release baseline was `https://korak-do-glasa-hosting-2026.web.app/assets/index-Dt5AAgH1.js`, verified at Sun, 13 Sep 2026 23:13:42 GMT; SHA-256 `245aa9240c4ac248ff5d4c60b2b7e2cb2b440a85c74541572c770f925f85cee3`. Individual public changes:

| Station ID | Previous email | Approved email | Approval change |
| --- | --- | --- | --- |
| `st-ar-emb-main` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-bo` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |
| `st-ba-emb-main` | `ambasada.sarajevo@mfa.rs` | `sarajevo2026@mfa.rs` | unconfirmed → operator-approved |
| `st-eg-emb-main` | `serbia@serbiaeg.com` | `serbia@serbiaeg.com` | unconfirmed → operator-approved |
| `st-nonres-ec` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |
| `st-ma-emb-main` | `ambrsrabat@gmail.com` | `ambrsrabat@gmail.com` | unconfirmed → operator-approved |
| `st-nonres-mr` | `ambrsrabat@gmail.com` | `ambrsrabat@gmail.com` | unconfirmed → operator-approved |
| `st-nonres-om` | `serbia@serbiaeg.com` | `serbia@serbiaeg.com` | unconfirmed → operator-approved |
| `st-nonres-ps` | `serbia@serbiaeg.com` | `serbia@serbiaeg.com` | unconfirmed → operator-approved |
| `st-nonres-py` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-pe` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |
| `st-nonres-sn` | `ambrsrabat@gmail.com` | `ambrsrabat@gmail.com` | unconfirmed → operator-approved |
| `st-nonres-sd` | `serbia@serbiaeg.com` | `serbia@serbiaeg.com` | unconfirmed → operator-approved |
| `st-nonres-uy` | `consulado.argentina@mfa.rs` | `consulado.argentina@mfa.rs` | unconfirmed → operator-approved |

Approval release validation passed: 87 Python tests, 63 Bun tests, TypeScript checking, data generation and the production build. Firebase deployment succeeded; live HTML and `/assets/index-BKbI2BZz.js` match the tested build byte-for-byte, and all public station fields match the generated dataset. Verified at Sun, 13 Sep 2026 23:15:15 GMT; release SHA-256 `77a39b8e2985800212cac9e73d6bac5de7938341cb7aa6d4e73bb8e8f1f123bb`.

## Follow-up check — 14 September 2026, 05:39 UTC

For this run the maintainer pre-approved newly discovered recipients when linked to exact official announcement pages, including their existing resolved coverage. No additional confirmation would have been required for a recipient meeting that condition. No new recipient or announcement was found.

Run `20260914T053952Z-8369d5054adf` selected the 39 remaining unconfirmed mission entries, retaining the earlier Paris, Yerevan and Nairobi exclusions. Their responsible hosts also cover the 38 remaining unconfirmed non-resident entries in scope; the other unconfirmed non-resident entry is the excluded Paris/Monaco record. The crawler attempted 34 mission hosts and fetched 230 pages. All 34 homepages were also checked directly. Five entries still lack an available mission website.

The 84 retained candidate IDs are unchanged, with zero new IDs and zero pending groups in the selected scope. Previously approved candidates remain recorded; no AI review or promotion was needed. The six notices for Brasilia, Tripoli, Tunis, Ankara, Istanbul and Vukovar still contain no mailbox in their body. Their text, image markup and attachment links are unchanged, and fresh downloads of all six images and nine Word attachments match the previously inspected files byte-for-byte. Mostar’s notice is unchanged and supplies no separate Drvar recipient.

Limitations remain: Strasbourg’s activities endpoint returns HTTP 403, Bahrain’s www/non-www hostnames fail DNS, and Zimbabwe’s X account returns HTTP 403. The MFA bilateral pages for the five entries without websites show no new usable mission website. Bounded crawl depth was reached for: `st-al-emb-main`, `st-ba-cons-drvar`, `st-br-emb-main`, `st-ch-cons-cirih`, `st-cu-emb-main`, `st-gr-cons-solun`, `st-gr-emb-main`, `st-hr-cons-vukovar`, `st-hu-emb-main`, `st-ir-emb-main`, `st-kw-emb-main`, `st-kz-emb-main`, `st-me-cons-hercegnovi`, `st-sk-emb-main`, `st-tn-emb-main`, `st-tr-cons-istanbul`, `st-tr-emb-main`, `st-ua-emb-main`, `st-va-emb-main`. These are acquisition limits, not declarations that a notice or recipient cannot exist.

The live deployment was reverified as `assets/index-BKbI2BZz.js`, with 140 approved entries. `bun run build:data` validated the refreshed source bindings and regenerated both public data files. Comparing all 223 station records to that live dataset shows identical recipients, approvals, coverage relationships, notice URLs and other public content; only Drvar’s automated notice observation time advances. Crawl metadata and this audit are committed for traceability. No Firebase deployment was necessary because there is no new public recipient or announcement.

## Second follow-up and operator-approved release — 14 September 2026, 13:12 UTC

The maintainer again pre-approved any newly found recipient when a working current official announcement explicitly connected the exact mailbox to voter registration. Run `20260914T131220Z-012f838cb104` selected the same 39 unresolved mission entries, excluding the recorded Paris, Yerevan and Nairobi announcement absences. It attempted 34 mission hosts and fetched 252 pages. Eight current notices with recipients had appeared or become reachable since the 05:39 UTC pass:

| Mission | Station ID | Approved recipient | Working official notice |
| --- | --- | --- | --- |
| Luanda | `st-ao-emb-main` | `srb.emb.angola@mfa.rs` | [Избори за народне посланике Народне скупштине Републике Србије 2026. године](https://luanda.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-narodne-skupstine-republike-srbije-2026-godine) |
| Baku | `st-az-emb-main` | `serbianembassy.consular.baku@gmail.com` | [Информација о расписивању парламентарних избора](https://baku.mfa.gov.rs/mediji/aktivnosti/informacija-o-raspisivanju-parlamentarnih-izbora-2026) |
| Zurich | `st-ch-cons-cirih` | `srb.cons.zurich@mfa.rs` | [Избори: Пријављивање за гласање у иностранству](https://zurich.mfa.gov.rs/mediji/aktivnosti/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| Strasbourg | `st-fr-cons-strazbur` | `consulate.strasbourg@mfa.rs` | [Избори: Пријављивање за гласање у иностранству](https://strasbourg.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) |
| Athens | `st-gr-emb-main` | `embassy.athens.consular@mfa.rs` | [ИЗБОРИ: ПРИЈАВА ЗА ГЛАСАЊЕ НА ПАРЛАМЕНТАРНИМ ИЗБОРИМА](https://athens.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijava-za-glasanje-na-parlamentarnim-izborima-nedelja-25-10-2026-godine) |
| Thessaloniki | `st-gr-cons-solun` | `srbcons@otenet.gr` | [ИЗБОРИ: ПРИЈАВА ЗА ГЛАСАЊЕ НА ПАРЛАМЕНТАРНИМ ИЗБОРИМА](https://thessaloniki.mfa.gov.rs/mediji/aktivnosti/zbori-prijava-za-glasanje-na-parlamentarnim-izborima-nedelja-25-10-2026-godine) |
| Budapest | `st-hu-emb-main` | `budapest-consulat@serbiaemb.t-online.hu` | [Избори за народне посланике 2026](https://budapest.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-2026) |
| Astana | `st-kz-emb-main` | `amb.astana@mail.ru` | [Избори за народне посланике 25.10.2026 — пријављивање за гласање у иностранству](https://astana.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-25-10-2026-prijavljivanje-za-glasanje-u-inostranstvu) |

Each notice was read in full. It names the 2026 election, identifies the relevant embassy or consulate, and directs the voter-registration request and required identity copy to the listed email. All eight secure non-`www` URLs returned HTTP 200 at review time. Seven pages displayed matching `mailto:` targets. Baku displayed the exact mailbox as ordinary text and supplied no `mailto:` target, so there was no conflicting destination.

Luanda’s notice contains an obvious copied reference to the Embassy in Rome and people visiting Italy, but the same operative paragraph gives the Luanda street address, appears on the official Angola mission site and directs requests to the Angola mission’s own `srb.emb.angola@mfa.rs` mailbox. The discrepancy is preserved here rather than silently corrected. The official address and mission identity still make the intended recipient clear.

The eight decisions use schema-version-2 operator authorization; no automatic AI review is claimed. Luanda’s existing exact covering-mission relationships extend its recipient and approval to Gabon, Equatorial Guinea, Namibia and São Tomé and Príncipe, which were included in the maintainer’s authorization. The other seven approvals affect only their own station records. Baku replaces a malformed concatenated public contact with the published election mailbox, while Athens replaces its ordinary embassy contact with the notice’s consular mailbox. The remaining six retain their existing public address and upgrade its approval.

The crawl remains partial in the precise automated sense: 19 selected entries reached the bounded depth, eight had no available site and Strasbourg’s `/mediji/aktuelnosti` listing returned HTTP 403. The actual Strasbourg notice itself returned HTTP 200 and was reviewed. These acquisition limits do not negate the eight direct findings and do not establish absence for the other missions.

The pre-release public baseline was the live asset `index-_GeAOpLL.js`, fetched at Mon, 14 Sep 2026 13:21:53 GMT with SHA-256 `ec7551f9218823ab374a148025f2387ae344d064be18a66569ed752846d3f1d4`. The semantic gate compared every stable station ID, email and approval, including resolved non-resident entries: **223 → 223 stations** and **140 → 152 usable approved recipients**, with zero removals or approval downgrades. The exact 12 changes are the eight approved missions and Luanda’s four covered countries described above.

Validation passed: `bun run build:data`, 87 Python crawler/promotion tests, 83 Bun application tests, TypeScript checking, the production build, JSON validation and `git diff --check`. Firebase Hosting deployment succeeded. At Mon, 14 Sep 2026 13:23:08 GMT, live asset `index-rZNNRuoV.js` matched the tested local build byte for byte; SHA-256 `68698ef9118e6299a1579a68b60832f3a505bb92b432d9aa23cac0fba5debe40`. The live bundle contains the new Baku, Athens, Luanda and Strasbourg recipients sampled during verification and reports 152 approved public station entries.
