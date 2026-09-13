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
