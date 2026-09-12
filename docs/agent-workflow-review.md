# Agent workflow review

This review concerns repository instructions and tooling, not a fresh verification of election dates or individual mailboxes. No recipient data or deployment is part of this change.

## Findings addressed

| Finding | Change |
| --- | --- |
| Root instructions contained only the deployment coverage gate, without the election/mission context. | AGENTS.md now explains registration notices, the three MFA directories, covering missions, operator decisions, and proportionate investigation. The existing gate is retained. |
| `request_review` prohibited inference of email purpose without explaining contextual reading. | The actual endpoint prompt now allows interpretation of the full notice, ordinary mailboxes explicitly used for registration, and supplied ministry coverage evidence. Exact citations and validation still apply. |
| Operations/takeover docs treated operator approval as an unusable or special unconfirmed state. | They now distinguish usable `operator-approved` recipients from `unconfirmed`, and explain the narrower legacy boolean. |
| The operator handoff still described only host/email matching after explicit ministry relationships were added. | Its resolution rules now match the builder's precedence; its recorded recipient decisions remain intact. |
| Extraction failures and new-review requirements were easily mistaken for reasons to withdraw existing recipients. | Instructions now separate failed attempts from negative evidence and automatic promotion from explicit operator authorization. |
| Deployment examples omitted the semantic coverage check. | The operations sequence now names the check between data generation and the release build and requires a verified deployed baseline. |

## Remaining implementation limits

These are boundaries to account for, not reasons to introduce a new framework during an instruction review.

- **Images and attachments:** `extract_html_evidence` reads text; `extract_pdf_evidence` uses PDF text extraction. There is no OCR path. Inspect a known official attachment directly before proposing an extractor change; preserve the source and use operator authorization when provided. The subsequent ten-embassy check added notice/source retention even without a mailbox, and skips incidental image links in ordinary page traversal.
- **Coverage evidence in review packets:** `build_packets` includes sources associated with a station's candidates. It does not import `official_coverage_relationships.json` or collect separate ministry coverage text into the packet automatically. `_scope_citation_is_explicit` checks for a covered-country name in a citation. The public builder can therefore resolve a country correctly while the automatic reviewer lacks citable coverage evidence. Use the maintained relationship path; do not fabricate a scope quote or repeatedly recrawl the same mission notice expecting it to name every covered country.
- **Context and citation constraints:** the validator requires an exact quote containing the target year, and a recipient quote containing both the exact mailbox and a registration-purpose match. A reviewer can use a longer exact passage from supplied source text. A split or image-only notice can still need a narrow acquisition/representation fix; prompt wording alone cannot supply missing text. Preserve these checks until a concrete failing source justifies a targeted change.
- **Prompt delivery:** configured endpoint calls use the updated prompt. Exported `review-packets.json` includes the response schema and evidence, but no system prompt. An external harness must also follow AGENTS.md and the `request_review` guidance; changing this repository cannot change a separately managed harness automatically.
- **Freshness:** the current 24-hour source-age policy gates new automatic promotion. It does not expire previously published operator/source approvals. Changing it is separate from correcting the instructions.
- **Pinned covering recipients:** explicit official relationships store their own recipient and approval. They do not automatically inherit later changes to the resident mailbox. Check dependent relationship/override records when updating that mission.
- **Deployment gate:** the repository's scripts do not currently provide a dedicated deployed-baseline semantic comparison command. The AGENTS.md gate still requires the comparison; a passing build cannot stand in for it. A verified release snapshot or live artifact must be available before deployment.

## Validation and follow-up

Validation completed: `python3 -m unittest discover -s tests -p 'test_election_*.py'` passed all 78 existing tests; `git diff --check` passed. No live model evaluation or fresh source crawl was performed. These checks cover the existing workflow machinery, not whether a real model interprets the new instructions correctly.

For a later live evaluation, use a small set of actual official notices: an election-specific mailbox, an ordinary consular mailbox explicitly receiving requests, an image notice, a separately documented non-resident relationship, an unrelated competition mailbox, and an older-election notice. Record the exact source, expected decision, actual model decision, and any acquisition/validation limitation. Do not turn fixture labels into claims of official verification or publish candidates merely to test the prompt.
