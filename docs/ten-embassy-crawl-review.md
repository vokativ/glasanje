# Ten more embassies and public notice evidence — 12 September 2026

Tested ten additional resident embassies whose public approval was `unconfirmed`: Albania, Cyprus, Czechia, Croatia, Hungary, Portugal, Romania, Slovenia, Slovakia, and Turkey. The branch also retains the earlier four-embassy review.

## Live results

| Embassy | Result within this sample |
| --- | --- |
| Albania | No current registration notice/recipient found; deeper run reached its page budget. |
| Cyprus | [Official registration notice](https://nicosia.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-prijavljivanje-za-glasanje-u-inostranstvu) explicitly gives `izbori.nikozija@mfa.rs`. The original run already extracted it. |
| Czechia | No current registration notice/recipient found; deeper run reached its page budget. |
| Croatia | No current registration notice/recipient found; deeper run finished `scanned-no-evidence`. The inspected homepage showed competition and other general notices. |
| Hungary | No current registration notice/recipient found; deeper run reached its page budget. |
| Portugal | No current registration notice/recipient found; deeper run reached its page budget. |
| Romania | No current registration notice/recipient found; deeper run reached its page budget. |
| Slovenia | [Official registration notice](https://ljubljana.mfa.gov.rs/mediji/najave-i-obavestenja/izbori-za-narodne-poslanike-25-10-2026-prijavljivanje-za-glasanje-u-inostranstvu) directs requests to `konzularno.ljubljana@mfa.rs` and `embassy.ljubljana@mfa.rs`. The original run missed both; the corrected run extracted both. |
| Slovakia | No current registration notice/recipient found; deeper run reached its page budget. |
| Turkey | Original run treated an incidental JPG attached to a travel advisory as a failed webpage acquisition. Corrected traversal skips that incidental image. No current registration notice/recipient found within the page budget. |

These are bounded observations, not assertions that an embassy without a finding has no voting arrangements. All ten homepages were also inspected through official-page retrieval. No additional embassy beyond these ten was explored; the already-known Bulgarian notice from the preceding sample was reacquired by exact URL to verify the no-email case.

## Failures corrected

**Long-notice context:** Slovenia's article establishes the current election well above its submission list. The extractor found the two mailbox strings but clipped their surrounding context to a window that lost the year. The subsequent election-context check discarded them. The extractor now retains the already-validated enclosing notice text when shortening it would remove the year. It still rejects old-election contexts and does not use site-wide footers or sidebars to supply addresses.

**Incidental images:** the ordinary crawler now skips image-file links alongside other non-page attachments. It still reports unsupported media when that URL is explicitly selected as the required notice. This is a traversal fix, not OCR support.

**Lost notice evidence:** a current registration notice is now kept even when no mailbox candidate exists. Its exact URL, title, election context, observation time, source chain, source text/hash and extracted-email status persist in the existing candidate artifact. Fresh observations appear in the run report and console. A failed retry retains the previous notice without representing it as newly observed.

## Website behavior

`bun run build:data` validates the notice's source binding and generates an optional `electionNotice` on the station. The status page and voting-destination card link directly to the official notice, with its election year. A resolved non-resident station can use its covering mission's notice; a direct station notice takes priority.

The generated branch currently includes links for Cyprus, Slovenia, and the previously inspected [Bulgarian notice](https://sofia.mfa.gov.rs/press-service/announcements-and-notifications/raspisivanje-izbora-za-narodne-poslanike). Bulgaria is recorded as `no-email-extracted`; Cyprus and Slovenia as `email-extracted`. These describe extraction, not recipient authorization. Unreviewed mailbox strings are not copied into the public recipient field. The status copy now makes clear that an address remains unconfirmed **in this tool**, rather than implying that an available official notice lacks confirmation.

## Reproduction and artifacts

Normal run:

```bash
bun run contacts:run -- --election-id 2026-parliamentary \
  --station st-al-emb-main --station st-cy-emb-main \
  --station st-cz-emb-main --station st-hr-emb-main \
  --station st-hu-emb-main --station st-pt-emb-main \
  --station st-ro-emb-main --station st-si-emb-main \
  --station st-sk-emb-main --station st-tr-emb-main \
  --max-hosts 10 --max-pages 200
```

The follow-up used the same ten station flags with `--mode deep-retry --max-hosts 10 --max-pages 300`.

| Local immutable run under `data/election_runs/` | Result |
| --- | --- |
| `20260912T083931Z-27fed105836a` | Original normal run: 110 fetched pages, Cyprus candidates, one incidental-image failure. |
| `20260912T084809Z-f8e39612da58` | Corrected deeper run: 300 fetched pages, Cyprus and Slovenia candidates, four notice records (two language variants per embassy), two page-budget exhaustion entries and no transport/media failures. |
| `20260912T085245Z-71403cdf3ff6` | Exact-URL acquisition of the previously known Bulgarian notice: one page, no failures, notice retained without a mailbox candidate. |

The deeper run exported two source-bound review packets. Both station groups remain held for a completed primary review; no model endpoint was configured, no AI review was fabricated, and no `--apply` was run. Six new candidate records (including language variants) were retained alongside the prior 46 records. Run directories are local ignored audit artifacts; notices and their source snapshots also persist in the tracked candidate artifact.

## Validation

- 84 Python tests pass, including long-notice extraction, notice-without-email preservation, failed rechecks, source-text tampering, listing/competition/old-election exclusion, and incidental images.
- TypeScript check and 60 application tests pass, including notice-link rendering without an approval claim.
- Local comparison by stable station ID: all 223 stations retain the same email, approval, and covering-station relationship. Usable coverage remains 101/223 (34 source-confirmed and 67 operator-approved).
- The local status UI was exercised in headless Chrome for Bulgaria, Cyprus, and Slovenia at desktop/mobile widths. Notice URLs were present and no horizontal overflow was found.

Nothing was deployed. The comparison above uses the pre-change branch dataset for local regression checking; it is not a substitute for the required deployed-baseline gate before a release build/deployment.

## What remains

The deeper run shows that broad archive traversal quickly consumes the page budget. Once a notice is known, prefer `--notice-url` for a one-page refresh. No page-budget increase or OCR service was added. Image-only notices still need visual inspection, and notice discovery remains separate from AI recipient approval.
