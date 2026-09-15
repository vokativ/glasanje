# Testing checklist

Use this as a repeatable checklist. Choose examples from the current dataset: countries used as unconfirmed in old runs may now be approved. Record actual results and screenshots in ignored `tmp/` or the commit/PR, not in this document.

## Choose checks for the change

| Change | Checks |
| --- | --- |
| UI, scripts, email or PDF | `bun run check`, `bun test`, production preview and relevant browser/PDF checks below |
| Crawler, review or builder | `python3 -m unittest discover -s tests -p 'test_election*.py'`; reproduce the actual failing page structure |
| Maintained recipient or notice | `bun run build:data`; compare affected parents/dependents and all public recipient changes |
| Documentation or unused-file removal | Check local links/references; build/test if files touch the application or toolchain |
| Release | [Deployment procedure](deployment.md#release-procedure), including the separate live coverage gate |

Follow the [toolchain prerequisites](../README.md#потребни-алати-на-новом-рачунару). Automated tests verify software behavior, not institutional approval of a mailbox.

## Production preview and flow matrix

Run `bun run build`, then `bun run preview -- --host 127.0.0.1`. Open Vite's printed URL using the available local Chrome debugging profile or browser tool. Check desktop and narrow mobile layouts; emulation does not prove physical-phone behavior.

Complete each combination:

| Dimension | Values |
| --- | --- |
| Script | Cyrillic, Latin |
| Recipient | Approved, unconfirmed |
| Entry | Direct form, coverage page → selected country |

Across these paths, exercise drawn and paper signatures, with and without an ID image. Include an embassy, an independent consulate and a resolved non-resident country. Use synthetic personal data and images visibly marked as test material.

- Direct entry starts at registry guidance. Country entry starts at personal details, retains country/script and does not mark registry verification complete.
- Validate required fields; navigate back/forward; change country/mission; cancel and confirm reset.
- Check that labels and flags show the applicant's country when an embassy elsewhere receives the request.
- Draw, clear and redraw a signature. Add/remove an image; reject invalid type and excessive size.
- Check the final summary, exact recipient, approval, notice link/status and registry reminder.
- Download and render every PDF page. Inspect Cyrillic glyphs, long-field wrapping, field positions, signature or deliberately blank box, and optional attachment page.
- Inspect registration, inquiry and invitation payloads in both scripts. Static copy follows the interface; names, addresses and entered values remain intact. Web Share and mail-product names stay English.
- Inspect desktop/mobile screenshots for clipping, overlap, contrast and overflow; check console errors.

## Coverage, inquiries and navigation

Derive expectations from `src/data/missions.ts` or `data/missions_canonical.json`, not copied documentation tables.

- Check alphabetical grouping, letter navigation, browser find, keyboard expansion and readable country/flag labels in both scripts.
- Compare every country's status with its station approvals: all, some, or none. Partial describes mission-recipient availability, not geographic coverage.
- Expand countries with several consulates. Preserve each office's email and evidence.
- Decode every offered inquiry link: exact resolved recipient, selected country, selected script, configured deadline/source and no personal form data. Approved missions omit the inquiry.
- Follow continue/back links and retain Latin preference. Exercise invalid/duplicate country parameters, empty search results and location-only invitations without inferred jurisdiction.
- Open privacy/help dialogs from each entry point. Check focus trapping, reverse Tab, Escape/backdrop closure, focus restoration and scrolling.

Capture mail/share/clipboard payloads at the API boundary or inspect drafts; do not send tests to real missions. Test cancellation, rejection, missing native file sharing and clipboard fallback. Report separately whether actual phones/email clients were exercised.

## Loading, offline use and failures

1. Open a fresh production preview; bypass service worker and HTTP cache when testing memory readiness.
2. Wait for the privacy dialog to report resources ready, then disable the network.
3. Complete the open form through PDF download with an attachment. Later screens, PDF engines, template and font should need no new fetch.
4. Force a template request failure; restore connectivity and confirm retry without lost fields.
5. Test service-worker upgrades separately with a returning profile. An open form working from memory does not prove arbitrary offline navigation.
6. Confirm uncached decorative flags do not block the form. Email delivery needs the user's mail service.

## Crawler and AI review

For judgment evaluation, select actual official sources representing: a dedicated mailbox, an ordinary mailbox used for registration, an image/scanned attachment, a covering embassy, separate consulates sharing a notice, a separate-office recipient such as Malta, an old-election notice and an unrelated competition address.

Record locally: station ID, URL, election/year, operative text or image location, expected recipient/scope, extraction outcome, actual model outcome and specific limitations. Do not update observation dates without revisiting sources. Reproduce parser failures using actual structures: distant headings/year, lazy images, broken mailto targets and reused article slugs.

Check parent-first approval, office exceptions, country-specific evidence and shared-fetch caching. Missing jurisdiction evidence in a packet is an acquisition limitation, not grounds to withdraw a published recipient. Prompt edits and synthetic tests alone do not measure live model accuracy.
