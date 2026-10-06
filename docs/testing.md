# Testing checklist

Use this as a repeatable checklist. Choose examples from the current dataset: countries used as unconfirmed in old runs may now be approved. Record actual results and screenshots in ignored `tmp/` or the commit/PR, not in this document.

## Choose checks for the change

| Change | Checks |
| --- | --- |
| UI, scripts, email or PDF | `bun run check`, `bun test`, production preview and relevant browser/PDF checks below |
| Crawler, review or builder | `python3 -m unittest discover -s tests -p 'test_election*.py'`; reproduce the actual failing page structure |
| Maintained recipient or notice | `bun run build:data`; compare affected parents/dependents and all public recipient changes |
| Follow-up guide, agent prompt or templates | `bun run build`, `bun test`, direct production-preview checks for `/pracenje/` and `/pracenje/agent.md`; exercise both prompts and provider fallbacks below |
| Release | [Deployment procedure](deployment.md#release-procedure), including the separate live coverage gate |

Follow the [toolchain prerequisites](../README.md#потребни-алати-на-новом-рачунару). Automated tests verify software behavior, not institutional approval of a mailbox.

## Production preview and flow matrix

Run `bun run build`, then `bun run preview -- --host 127.0.0.1`. Open Vite's printed URL using the available local Chrome debugging profile or browser tool. Check desktop and narrow mobile layouts; emulation does not prove physical-phone behavior.

Complete each combination:

| Dimension | Values |
| --- | --- |
| Script | Cyrillic, Latin |
| Station state | Approved (green), Notice without dedicated email (yellow/amber), Unconfirmed (red) |
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

## Follow-up service

The service has two independent prompt paths:

- **Social prompt:** `Отвори https://korakdoglasa.org/pracenje/agent.md`
- **Website prompt:** the fuller visible/copyable prompt beside the provider buttons.

Check that both prompts start the same follow-up task, not a page summary. Test them in separate fresh browsing-assistant conversations after the public resources are reachable. A verified prefilled composer or copied text proves the handoff, not that the model read the instructions or handled a case correctly. For ChatGPT and Claude, verify the fixed detailed prompt reaches the composer and survives any user-selected mode change; for ordinary Gemini, use copy-and-paste. Record login, subscription, rollout or connector limitations rather than assuming every account has Work, Spark or Cowork. Never infer private-mail or send permission from the starter prompt.

On a production preview, request `/pracenje/`, `/pracenje/latin/`, `/pracenje/agent.md`, `/pracenje/templates.json`, `/pracenje/workflow.json`, `/pracenje/sources.json`, `/pracenje/case.schema.json`, `/pracenje/election-profile.example.json` and both script variants of `templates.md` directly. Verify 200 responses, HTML/Markdown/JSON content, valid UTF-8, no React shell fallback, and full instructions when JavaScript is disabled. Follow every T01–T16 and source link/fragment; each opens the matching section. Test narrower screens, keyboard use, print/opened templates, and both scripts. Generated assets are intentionally ignored; run `bun run build:follow-up` or the normal `predev`/build before preview.

Exercise the buttons in a real browser context: exact short text copied; fuller prompt visible and copied; ChatGPT/Claude query links and Gemini copy-and-open navigate without delay; ordinary Gemini accepts a native paste without Spark. Clipboard denial must report manual-copy instructions, remove the temporary textarea and restore focus to the triggering button on both the React homepage and static manual page. When a clipboard-read tool is unavailable, verify the content with native paste into a temporary local field, then remove that field. No private case data may enter a provider URL. Confirm the homepage's concise four-step summary, the guide's complete manual procedure, all sixteen templates and the source catalogue remain available without JavaScript.

Exercise the shortened guide's native disclosures: open a manual step and follow its template link; open `#sources`; confirm both reveal the correct details. With JavaScript disabled, summaries must still open the full instructions and all sixteen template bodies must remain in the HTML. Before printing, all manual/setup/source/template details open; afterward their prior state returns. Check provider buttons remain ahead of the longer social-prompt box on narrow screens, and retain the visible urgent-remedy warning.

Review `content/follow-up/workflow.json` transitions for preliminary positive versus final/adverse decisions, first-instance versus second-instance silence, explicit approval before sending/filing, and bounded wait re-entry. Run `tests/follow-up-workflow.test.ts`. Connected-email checks require explicit user permission, narrow case search, multiple-message disambiguation, actual attachment content (not metadata), duplicate draft prevention and approval of exact recipients/body/attachments. Never send to actual public authorities during testing.

Use synthetic case facts to assess the actual agent procedure: no acknowledgement, confirmed forwarding with unknown municipal receipt, preliminary positive recording, final positive decision, adverse decision, and second-instance silence. Include unavailable sources/attachments, multiple possible applications, read-only connectors, and existing drafts. Keep actual source research separate from generated prose: official contact, jurisdiction, election dates and remedy conditions require cited case-specific evidence. An unknown status must not become a rejection, confirmed non-receipt or automatic appeal. Use a private continuation summary to resume the same case; a written reminder plan is not configured background monitoring.

Verify the site does not acquire case data. The service worker must not cache `/pracenje/` resources. Test a returning profile with an open registration draft while an updated worker waits: the current page must stay under its existing controller and retain the draft; activation occurs after old controlled pages close. Then check a fresh navigation uses the new worker.

## Coverage, inquiries and navigation

Derive expectations from `src/data/missions.ts` or `data/missions_canonical.json`, not copied documentation tables.

- Check alphabetical grouping, letter navigation, browser find, keyboard expansion and readable country/flag labels in both scripts.
- Compare every country's status on `/status`: all approved (`confirmed`), some approved (`partial`), no approved but notice published (`notice`), or no approved and no notice (`unconfirmed`). Partial describes mission-recipient availability, not geographic coverage. Yellow/notice status distinguishes missions that published 2026 election announcements from those with no notice at all.
- Expand countries with several consulates. Preserve each office's email, evidence and yellow/unconfirmed status.
- Decode every offered inquiry link: exact resolved recipient, selected country, selected script, configured deadline/source and no personal form data. Approved missions omit the inquiry. For yellow missions, verify that the text acknowledges the published notice rather than asking when a notice will appear.
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
