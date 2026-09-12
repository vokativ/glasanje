# Deployment safety rules

## Public recipient coverage

Before every Firebase deployment, compare the generated public station dataset with the last deployed dataset.

- A deployment **MUST NOT** remove a non-empty public recipient email from any station.
- A deployment **MUST NOT** reduce a station's approval level: `source-confirmed` → `operator-approved` → `unconfirmed`.
- A deployment **MUST NOT** reduce the total number of stations with a usable election recipient (`source-confirmed` or `operator-approved`).
- Non-resident stations are included in this gate. Their resolved covering-mission recipient and approval state count as public coverage.
- If any coverage would decrease, stop before deployment. Continue only with the user's explicit approval in this conversation that identifies every affected station and its intended replacement or withdrawal.

Validate this semantic diff after `bun run build:data` and before `bun run build` / `firebase deploy`; do not rely on a successful TypeScript build or deployment as coverage evidence.
