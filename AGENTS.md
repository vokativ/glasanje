# Working on Корак до гласа

## Purpose and domain context

This is a small, periodic project used around Serbian elections, usually every four or five years. It helps citizens abroad prepare a voter-registration request and send it themselves to the responsible Serbian diplomatic or consular mission. It does not cast votes, submit requests, or guarantee that a polling place will open. Favor a maintainable tool that can be picked up again next election over a permanent crawling or approval platform.

The Ministry of Foreign Affairs (MSP/MFA) publishes three complementary directories: embassies, consulates, and countries covered on a non-resident basis. All three belong in our coverage. A country without a resident mission is not necessarily unserved: its entry may designate an embassy in another country. One embassy can serve several countries; several consulates in one country can have distinct recipients. Do not merge those consulates or substitute the embassy's address merely because they share a country.

An election notice commonly gives a specific address for sending the completed request and attachments. It may be below the ordinary contact address, in an image, or in a linked document. It can also explicitly reuse the mission's ordinary consular mailbox. The purpose comes from the notice, not the spelling of the address: `izbori`/`izb` is a useful discovery clue, not proof, and a Gmail or non-MFA mailbox is acceptable when the official mission publishes it for that purpose.

Read this file first. Use [election-contact operations](docs/election-contact-operations.md) for commands and schemas, and the [operator handoff](docs/operator-approved-recipient-handoff.md) for recorded decisions. This file is the current guidance for agent judgment; historical examples in handoffs must not override it or a later explicit user instruction.

## How to judge evidence

- Read the whole relevant notice, including its title, date, headings, submission instructions, and attachments. Interpret Serbian Cyrillic, Serbian Latin, and translations in context. An election heading followed by instructions to send the request to an address is sufficient contextual evidence; every sentence need not repeat the election year or say "dedicated election mailbox."
- Distinguish registration instructions (`prijava za glasanje`, `zahtev`, `birački spisak`, `ostvarivanje biračkog prava` and their Cyrillic equivalents) from unrelated news, results, visa services, and competitions. A notice about the current election may direct both voter-register and voting-abroad requests to the same address. A site-wide footer alone does not establish that purpose. `konkursi@dijaspora.gov.rs` was an unrelated competition contact and must not be reintroduced as an election recipient.
- Use official MFA directory relationships to establish mission identity and territorial coverage, and the mission's notice to establish the recipient. Those facts may be on separate pages. Do not demand that an embassy repeat every covered country in each election announcement. Do not invent jurisdiction from a similar hostname, geography, or a shared email address. Follow explicit territorial restrictions in the notice if present.
- An official source is authoritative because it is published by the relevant institution, not because our parser, model, fixture, or validation script labels it official. Keep the source URL and the relevant text or visual evidence. A passing test proves software behavior, not a real-world recipient or jurisdiction.
- Check which election the notice concerns. An old notice can help locate the mission or mailbox but does not establish a new election's instructions or deadline. Missing a deadline in an otherwise clear notice does not invalidate its recipient; do not invent a deadline.
- A failed fetch, crawl limit, missing text, OCR failure, or model `needs_review` means the attempt did not establish a fact. It is not evidence that a published recipient is invalid. State the specific missing fact or tool limitation instead of saying vaguely that a page is "not conclusive."

## When text extraction misses the answer

Open the rendered official page and inspect the relevant image, PDF, or linked document using available browser/document tools. Use OCR as an aid and visually check the exact mailbox and its surrounding instructions. Keep the official page/attachment URL and page or image location; do not guess ambiguous characters or claim to have read media you could not open.

The crawler currently extracts HTML and PDF text; it does not OCR images or scanned PDFs, and it records many attachment links without downloading them. `--notice-url` targets a known notice but does not add those capabilities. A limitation in this automated path is not a rule against using clear official visual evidence. Do not edit immutable candidate/review artifacts to pretend an unsupported extraction succeeded. Use the existing operator-approval path when authorized, or describe the narrow extraction gap and preserve the current recipient. Do not build an OCR platform to resolve a single readable notice.

## Approval and operator decisions

`electionContactApproval` is the public approval state:

| State | Meaning for this project |
| --- | --- |
| `source-confirmed` | Source-backed confirmation represented by the existing evidence/provenance model. |
| `operator-approved` | An explicitly approved usable election recipient, including maintained covering-mission decisions. |
| `unconfirmed` | A public contact without either election-recipient approval. |

Both `source-confirmed` and `operator-approved` count as usable election recipients. `isElectionContactConfirmed` is the narrower legacy boolean for `source-confirmed`; false does not mean an operator-approved address is unusable. Do not collapse the three states back into that boolean.

The maintainer has explained that their recipient and coverage decisions come from checking actual ministry and embassy websites. Treat an explicit station/recipient decision in the conversation or maintained handoff as operator authorization, not an untrusted guess requiring another AI to approve it. Preserve that authorization honestly using the existing structured provenance (`schemaVersion: 2`, `authorization: {"type":"operator"}`, election ID/year). Do not fabricate AI calls, source quotes, dates, or a `source-confirmed` label. A broad instruction to research contacts is not approval of arbitrary new addresses. If a specific decision is ambiguous, ask only for the missing station/address or scope; do not ask again for a decision already provided.

For newly discovered automatic candidates, use the existing single primary AI review and separate apply step. The architect role is for actual ambiguity/conflicts or replacements required by the promotion tool, not routine second opinions. An operator-authorized correction is a distinct maintained-data path, not a fabricated automatic review. Existing packet validation still applies: if it cannot represent otherwise clear evidence, report that mismatch rather than rejecting the real-world fact or weakening validation indiscriminately.

## Non-resident recipients and maintained data

Use the existing data model; do not introduce another coverage convention:

- `data/mfa_representations.json`: scraped ministry directory input.
- `data/overrides.json`: maintained mission corrections, explicit election recipients, and their authorization.
- `data/official_coverage_relationships.json`: explicit ministry covering-mission relationships, with the selected recipient and approval. Record the official source supporting a new relationship in the change/handoff; the `ministry-coverage` tag by itself is not independent evidence.
- `data/missions_canonical.json` and `src/data/missions.ts`: generated together by `bun run build:data`; do not hand-edit them.

`data/election_candidates.json` also retains source-bound `notices` independently of mailbox candidates. `email-extracted` means the notice text contains an email, not that the email is approved for registration; `no-email-extracted` does not rule out an address in an image or attachment. Preserve the actual notice URL and source snapshot even without a candidate. The builder validates these source bindings and exposes an `electionNotice` link on the website, including through an already-resolved covering mission. A notice link must not change the station's recipient or approval.

For a non-resident station, recipient precedence is: its own explicit `electionEmail` override → explicit official coverage relationship → unique automatic match on both canonical website host and baseline primary email → unresolved raw contact. Apply resident corrections before resolving coverage. Keep `coveringStationId` and `coverageSourceEmail` as provenance. Never add `_coverageStationId` to overrides.

The exact host/email match is an automatic fallback, not the definition of diplomatic jurisdiction. When the MFA explicitly identifies a covering mission, use the official relationship even if old baseline contact strings differ. An explicit relationship stores its own recipient/approval; it does not automatically follow later resident email changes. Review all dependent countries whenever a covering mission changes, including explicit relationships and non-resident overrides.

## Keep the workflow proportionate

Start with the named stations, known notice URLs, existing evidence, and recorded decisions. Use targeted discovery or a browser inspection before a full crawl. Routine `contacts:run` writes crawl state and candidates; it is not read-only. Use a full crawl only when the task calls for the whole directory. Keep a single workflow owner and preserve run artifacts.

Prefer a correction in the existing data/provenance model or a small parser/prompt fix over a new service, approval layer, schema, or review harness. Explain any added mechanism by the concrete failure it fixes. Stop rechecking a resolved fact unless new conflicting evidence or the task justifies it. Do not turn the automatic promotion tool's freshness window into an expiry timer for published approvals.

Verify changes at the layer they affect. Use relevant existing Python tests for crawler/promotion changes, and `bun run check` / `bun test` for application changes. For a parser bug, add a focused regression reproducing the actual page structure. Prompt wording and synthetic tests do not prove model accuracy; report whether representative real notices were actually reviewed. Report affected stations, recipient/approval changes, source evidence, and any unresolved limitations plainly.

## Preserve published coverage

A published recipient is durable project state. Parser changes, stricter evidence schemas, an unavailable page, a new model opinion, or an election rollover must not silently erase it or downgrade its approval. Investigate conflicting evidence and propose a concrete correction. Do not represent an old deadline as current; handle election rollover deliberately while preserving the recipient history. This preservation rule is an operational safeguard, not a claim that mailboxes never change.

For local data changes, compare before/after by stable station ID and inspect all dependent non-resident stations. Every recipient replacement needs a supported reason, even if the number of populated addresses stays the same. Station deletion or ID churn must not hide a loss. A local baseline helps review but is not a substitute for the last deployed baseline below.

## Public recipient coverage

Before every Firebase deployment, compare the generated public station dataset with the last deployed dataset.

- A deployment **MUST NOT** remove a non-empty public recipient email from any station.
- A deployment **MUST NOT** reduce a station's approval level: `source-confirmed` → `operator-approved` → `unconfirmed`.
- A deployment **MUST NOT** reduce the total number of stations with a usable election recipient (`source-confirmed` or `operator-approved`).
- Non-resident stations are included in this gate. Their resolved covering-mission recipient and approval state count as public coverage.
- If any coverage would decrease, stop before deployment. Continue only with the user's explicit approval in this conversation that identifies every affected station and its intended replacement or withdrawal.

Validate this semantic diff after `bun run build:data` and before `bun run build` / `firebase deploy`; do not rely on a successful TypeScript build or deployment as coverage evidence.

Identify the last deployed dataset by a verified release snapshot or the live deployed artifact, and record its origin. Do not assume the current branch, `master`, or an arbitrary local `dist` is deployed. Compare each station's public email and approval (including removed IDs and resolved non-resident entries), as well as the total usable count; a gain elsewhere cannot offset an individual loss. Show old/new values for changes. If the deployed baseline is unavailable, continue local work but stop before deployment and identify that missing prerequisite.
