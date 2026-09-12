# Four-embassy collection check — 12 September 2026

Scope: the currently `unconfirmed` resident embassies in Bulgaria, Iran, France, and Greece. No other mission was selected for collection. No recipient, approval, generated public dataset, or deployment was changed.

## Live process exercised

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --station st-bg-emb-main --station st-ir-emb-main \
  --station st-fr-emb-main-paris-mfa-gov-rs --station st-gr-emb-main \
  --max-hosts 4 --max-pages 80
```

The normal run fetched 29 pages across the four selected mission hosts, reported zero fetch failures, found no selected candidates, and marked all four stations `depth-limited`. Its 46 output candidates were retained records from earlier work, not 46 new findings. The report's 223 station rows describe the registry, not 223 attempted stations.

The documented `--mode deep-retry` was then used on the same four IDs with `--max-hosts 4 --max-pages 160`. It fetched 61 pages, again found no selected candidates and no fetch failures, and marked France/Iran `scanned-no-evidence`, Bulgaria/Greece `depth-limited`.

Both runs completed the no-candidate branch of the collection process: they wrote discovery/readiness artifacts and skipped review and promotion. This did not exercise a successful candidate-to-AI-review path. No `ELECTION_AI_*` endpoint configuration was present, and no AI review artifact was invented.

Local immutable run directories under `data/election_runs/`:

- Normal: `20260912T082846Z-a49513bd1271`.
- Deep retry before fix: `20260912T082936Z-23f600a0e45c`.
- Deep retry after fix: `20260912T083218Z-7c99c0395df1`.

## Official-page inspection

| Embassy | Observed evidence | Assessment of this sample |
| --- | --- | --- |
| Bulgaria — `st-bg-emb-main` | The [current election announcement](https://sofia.mfa.gov.rs/press-service/announcements-and-notifications/raspisivanje-izbora-za-narodne-poslanike) contains voting-abroad request instructions but no recipient mailbox in its fetched text. Its lazy-loaded main image was downloaded and visually inspected: it is the MFA logo, without a mailbox. The document links point to a request form hosted on another mission site; that other mission was not crawled. | The crawler did not discard a visible registration email from this notice. It should still distinguish an election notice without a recipient from a site with no election notice. |
| Iran — `st-ir-emb-main` | The [email-change announcement](https://tehran.mfa.gov.rs/mediji/najave-i-obavestenja/obavestenje-o-promeni-e-mail-adresa-ambasade-republike-srbije-teheran) assigns visa, consular, and general contacts. The fetched activity listing also contains an unrelated diaspora-project competition. | No current-election registration recipient was established. Treating these ordinary addresses or competition contacts as newly election-confirmed would be unsupported by the inspected content. |
| France — `st-fr-emb-main-paris-mfa-gov-rs` | The fetched [homepage](https://paris.mfa.gov.rs/) and [news listing](https://paris.mfa.gov.rs/mediji/aktuelnosti) contain no news entries. Homepage image links concern general public services and promotional banners. | No registration notice was found in this sample; an empty listing is not proof that the embassy has no voting arrangements. |
| Greece — `st-gr-emb-main` | The [homepage](https://athens.mfa.gov.rs/) and the activity listing fetched directly by Python show ordinary embassy news; no current-election recipient was found in the bounded crawl. | The archive traversal remains bounded. Do not describe this as a conclusive search of every historical page or as proof that no election mailbox exists. |

The browser-control surface was unavailable. Inspection used official-page retrieval, direct HTML/link inspection, and direct image viewing; no rendered-browser inspection is claimed. Separate web-tool timeouts did not occur in the recorded crawler runs.

## Concrete fix

At the depth cap, the crawler previously marked a host `depth-limited` whenever a page contained any traversable link. MFA pages repeat links to the news listing, the current notice, and sibling notices already scheduled in the same batch. Those links do not represent unexplored work.

`discover_election_contacts.py` now checks the same country/URL/station/source-selection task identity used for crawl deduplication before reporting a depth limit. Only an unseen task triggers that status. Fetch scope, limits, candidate extraction, and approval rules are unchanged.

A regression test reproduces the repeated-navigation structure and also checks that a genuinely unseen link still triggers `depth-limited` without being fetched past the cap. It failed before the fix. All 79 existing-plus-regression Python tests pass after the fix.

The live deep retry after the fix again fetched 61 pages with zero failures and no selected candidates. Its station statuses were unchanged: Bulgaria/Greece still have unseen links at the cap, while France/Iran finish `scanned-no-evidence`. The fix removes the demonstrated false-positive condition; it does not claim to eliminate actual depth limits or to have recovered a mailbox in this sample.

The routine command rewrote candidate-run metadata and recalculated the global pending list. Since this was a collection experiment, the tracked candidate file was restored to its pre-experiment contents after preserving each run's output in its immutable directory. Existing recipient and approval files were never modified.

## Remaining narrow improvements

The collection report does not retain a per-page reason for an election notice that yields no candidate. A small diagnostic entry containing URL and a reason such as "election notice found, no recipient extracted" would make cases like Bulgaria much easier to review. This sample does not justify adding a new OCR service or weakening recipient evidence checks.

The runner's completion message also needs to be read with `discovery-report.json`: an empty review worklist means there is nothing to review, not that every selected embassy has a usable address. The existing reports preserve this distinction, but the console summary could make it more prominent.
