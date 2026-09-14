# Visual and flow QA — 14 September 2026

Branch: `improve-country-entry-and-inquiry`. Tested the production build in the existing Chrome profile through its debugging connection, using a local Vite preview. Desktop flows used 1280 × 960; coverage-entry flows used a 390 × 960 mobile viewport and Android user agent. This is browser emulation, not a physical-device certification.

## Main matrix

All eight complete paths passed, including actual PDF downloads:

| Script | Mission status | Entry | Signature | ID image | PDF pages |
| --- | --- | --- | --- | --- | --- |
| Cyrillic | Austria, approved | Direct form | Drawn | Included | 2 |
| Cyrillic | Austria, approved | Coverage page | Paper | Absent | 1 |
| Cyrillic | Singapore, unconfirmed | Direct form | Drawn | Absent | 1 |
| Cyrillic | Singapore, unconfirmed | Coverage page | Paper | Included | 2 |
| Latin | Austria, approved | Direct form | Drawn | Included | 2 |
| Latin | Austria, approved | Coverage page | Paper | Absent | 1 |
| Latin | Singapore, unconfirmed | Direct form | Drawn | Absent | 1 |
| Latin | Singapore, unconfirmed | Coverage page | Paper | Included | 2 |

Austria used Vienna's `izbori.bec@mfa.rs`. Singapore retained its resolved Jakarta contact, `consular.jakarta@mfa.rs`, and displayed the unconfirmed warning and inquiry option. No recipient or approval was changed.

Each path checked personal-field validation, selection and flags, destination retention, signature mode, optional attachment, final summary, script-correct main email, download, clipboard payloads and invitation. Drawn-signature paths also checked the native-file-share payload. Coverage entry started at personal details and did not falsely mark the registry step complete. The final registry reminder was present.

## Additional paths and states

Checked in both scripts:

- Registry help and the not-enrolled alternative; back navigation; cancel and confirm reset.
- Every country's approval-summary class against all 195 generated country records; alphabetical links and country expansion; retained script on continue/back links.
- Partial Bosnia and Herzegovina, unconfirmed Singapore, maintained no-announcement Monaco, and the special SMOM flag entry.
- Salzburg as a separate Austrian consulate; unresolved Taiwan and no-result country search; invalid/duplicate country URL input.
- Location-only invitation entry without an inferred country, plus clipboard fallback and canceled invitation sharing.
- Draw, clear and redraw signature; valid attachment add/remove, camera-input file handling, invalid type and oversized image rejection.
- Native-share cancellation/failure feedback and generated PDF retry after deliberately failing the template request.
- Privacy dialog opening from header/footer, focus placement, forward/reverse Tab containment, Escape/backdrop closing and focus/scroll restoration.

Preloading was tested separately in four additional complete paths: Austria/Singapore × Cyrillic/Latin. After the privacy dialog reported readiness, Chrome's network was disabled with both its HTTP cache and service worker bypassed. The open form still reached export and downloaded a PDF with an attachment in every case. No JavaScript, font or template requests were needed after disconnecting. Uncached decorative flag requests can fail offline; they do not block the form or PDF.

## Findings and fixes

1. The main registration email stayed Cyrillic under a Latin interface. Subject, body and helper-owned share/copy instructions now follow the selected script while preserving entered names and other dynamic values. Added focused regression tests for both signature modes and mixed-script personal text.
2. The privacy dialog lacked keyboard focus ownership and Escape handling. It now traps/restores focus, locks/restores page scrolling and has a linked accessible title. A stable close callback prevents background readiness updates from moving focus.
3. The later screens and PDF dependencies were loaded only when needed. Startup now prepares those modules and the official template/font in the background. In-flight asset work is shared; successful bytes stay in memory; failed fetches can retry. The dialog reports readiness and its privacy/offline copy reflects actual behavior.
4. Expanded code comments and added the [architecture guide](architecture.md) and [documentation map](README.md), covering ownership, state transitions, data provenance, scripts, memory, failures and maintenance checks.

Visual inspection covered desktop/mobile screenshots, warning and partial states, dialogs and rendered forms. No blocking clipping, overlap or horizontal overflow was found in the tested paths. Country flags remain beside readable country names. Eight downloaded PDFs were rendered into 12 pages and inspected: field placement, Serbian glyphs, wrapping, signature/blank-signature treatment and optional attachment page were correct for the supplied test values.

## Evidence and limits

The local evidence directory is `tmp/release-qa-20260914/`, excluded from Git. It contains a searchable `index.html` screenshot gallery, browser PNGs, PDF renders, JSON results, test/build logs, the deployed-data baseline and the scripts used for this review. Test inputs are synthetic; the attachment explicitly says it is not an ID document. The archive is a local QA artifact, not part of the public Firebase deployment.

The browser really rendered the application, accepted input, drew signatures, processed images and downloaded PDFs. Clipboard/native-share calls used test doubles at the browser API boundary to capture payloads and simulate cancellation/failure. No emails were sent to missions. Actual external email clients, physical camera hardware, iOS and non-Chromium browsers were not tested in this run. External official pages were inspected as link destinations, not re-audited for new recipient evidence.

Verification: `bun run check`, 83 passing Bun tests, production build and `git diff --check`. Main matrix and focused final checks recorded zero unhandled JavaScript exceptions. The existing large PDF-engine chunk warning remains; the chunk is deliberately separate and now prepared in the background.

## Public coverage gate

After `bun run build:data`, compared each generated public station's stable ID, email and three-state approval with the live deployed dataset, including non-resident entries and removals. Baseline was the live main JavaScript asset `index-BKbI2BZz.js`, SHA-256 `77a39b8e2985800212cac9e73d6bac5de7938341cb7aa6d4e73bb8e8f1f123bb`, fetched at 09:35:29 UTC and reverified at 09:59:04 UTC on 14 September 2026. The source URL and captured artifact are recorded in the local `baseline/origin.json` and baseline directory.

Before/after: **223 stations, 140 usable approved recipients**. There were **zero email/approval changes, zero removed station IDs and zero losses**. No replacement or withdrawal approval was needed.

## Deployment verification

Firebase Hosting deployment completed successfully. At Mon, 14 Sep 2026 10:01:49 GMT, the live main asset `index-_GeAOpLL.js` matched the tested local build byte for byte (SHA-256 `ec7551f9218823ab374a148025f2387ae344d064be18a66569ed752846d3f1d4`). Sample local flag SVGs matched as well. A fresh Chrome smoke check on the deployed site passed in Cyrillic and Latin: privacy keyboard handling, all country status classes, focused country expansion, alphabetical navigation, country-to-personal-details continuation and offline-resource readiness.
