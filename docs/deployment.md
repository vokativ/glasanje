# Deployment and maintenance

## Hosting and domains

Firebase Hosting serves the built React application. Cloudflare manages DNS for the public domains. GitHub Pages is disabled; the repository README is the project overview.

| Domain | Public behavior |
| --- | --- |
| [korakdoglasa.org](https://korakdoglasa.org/) | Application; main README link |
| [korakdoglasa.com](https://korakdoglasa.com/) | Application |
| [korakdoglasa.rs](https://korakdoglasa.rs/) | Application |
| [коракдогласа.срб](https://коракдогласа.срб/) | Redirect to `https://korakdoglasa.com/` |

All four use Cloudflare nameservers. Nameservers alone do not establish proxy status or ownership of redirect rules. Inspect the owning Cloudflare/Firebase settings before changing them. Keep accounts, credentials, DNS verification values and project selection in ignored local `OPERATOR.md` and `.firebaserc`; use [OPERATOR.md.example](../OPERATOR.md.example) on a fresh machine.

`firebase.json` serves `dist/glasanje` with SPA rewrites and cache/security headers. Vite builds from root `index.html`. `predev` and `build` generate ignored `public/pracenje/` resources from the maintained `content/follow-up/` package; those files are copied directly to Hosting, so Firebase serves them before the SPA rewrite. `public/sw.js` fetches `/pracenje/` from network without storing it in Cache Storage. Publishing raw repository files is not a working deployment.

Direct Markdown responses require `text/markdown; charset=utf-8`. Firebase headers and Vite development/preview middleware supply that header; verify decoding in the browser as well as response bytes. A working HTML guide does not prove the raw agent document is correctly decoded.

## Release procedure

1. Read `AGENTS.md`, verify the Firebase project/alias and confirm deployment scope. The follow-up guide is not a new hosting service and needs no DNS cutover. Keep `.firebaserc`, credentials and `OPERATOR.md` ignored.
2. Obtain the last deployed public dataset from a verified release snapshot or live application artifact. Record URL, fetch time and hash in a local release directory. Fetch the current HTML and its referenced bundle, not an assumed old filename; preserve the dataset extracted from that artifact. Neither the branch nor an arbitrary local build establishes what is deployed.
3. Run `bun run build:data`. Compare every stable station ID: removals, old/new email, old/new approval, resolved non-resident entries and total usable recipients. Report distinct-country counts separately. Follow the exact loss gate in `AGENTS.md`; a gain elsewhere cannot offset a loss. A follow-up-only release still requires this gate. Stop on missing baseline or unauthorized loss.
4. Run relevant [testing checks](testing.md), then `bun run build`. The build generates the complete follow-up HTML/Markdown/JSON from maintained content; never manually copy or edit generated `public/pracenje/` files. Check initial HTML, raw Markdown charset, disclosures, provider handoffs and active-draft behavior. Keep logs, screenshots, rendered PDFs and baseline snapshots in ignored `tmp/`, not `public/` or maintained docs.
5. Deploy the checked build to the verified target:

```bash
firebase deploy --only hosting --project YOUR_VERIFIED_PROJECT_OR_ALIAS --non-interactive
```

If the CLI reports expired or invalid authentication, stop that deployment and report the exact error. Do not start an interactive login on an unattended machine. Local documentation, tests, commits and pushes can still be completed; deployment remains pending until the maintainer restores access. Do not mark a failed deployment as a new verified release baseline.

6. Fetch live HTML and referenced assets from the Firebase hostname and public domain; compare their bytes or hashes with the local build. Fetch `/`, `/status`, `/pracenje/`, `/pracenje/latin/`, `/pracenje/agent.md`, every linked JSON/Markdown resource and both template Markdown variants. Confirm direct content and `text/markdown; charset=utf-8`, not a 200 response containing the SPA shell. Browser-check both scripts, manual/template/source disclosures, copying, provider handoffs, country continuation and resource readiness. Prefilling or mode selection alone does not verify the agent's case-handling behavior; use the separate [follow-up checks](testing.md#follow-up-service).
7. Recheck domains/redirects after hosting changes. Record the deployment result, verified public asset identity, recipient comparison and unresolved assistant/source limitations in the commit/PR or ignored local release record.

Keep a verified snapshot of the latest successful release until its replacement is independently verified. Save its public country/station dataset, fetched HTML/bundle and provenance together; this is the next deployment's preservation baseline, not evidence that each election contact remains current.

### Post-deadline cutover release safety rules

- **Never run `firebase hosting:disable`**: Disabling hosting serves an unhelpful English 404 error ("Site Not Found"), breaks citizen trust, and takes down the `/status` embassy contact directory. The cutover is managed in the application and edge caching.
- **Do not alter Cloudflare DNS or proxy settings on deadline night**: Avoid toggling proxy status, introducing edge redirects, or caching 301s.
- **Freeze `public/sw.js` byte-for-byte on deadline night**: No service-worker changes during the cutover. Its normal update waits for controlled clients to close before activating, so it does not force-reload an open memory-only registration draft. Verify this lifecycle with a returning profile before any planned worker change.
- **Soak period and deployment freeze**: Deploy the deadline release 24–48 hours ahead of the deadline (`2026-10-03T22:00:00Z`). Freeze deployments from 2026-10-02T00:00:00Z until after the election deadline so visitors receive a thoroughly soaked build.
## Domain maintenance

For each domain inspect authoritative nameservers, HTTPS certificates, response/redirect destination, application assets and `/status`. When changing redirects, test paths and queries, including `?script=latin` and country-entry parameters.

For new or repaired custom domains use the current [Firebase procedure](https://firebase.google.com/docs/hosting/custom-domain) and exact generated records. Preserve unrelated mail and verification records. Inspect existing [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/) rather than toggling it by assumption. Normal application releases need no DNS change.

## Preparing for another election

- Verify the official form, election date, registration deadline and source links. Do not relabel old notices as current.
- Review `src/lib/deadline.ts`, `src/lib/missionInquiry.ts`, export/invitation copy, README and election ID/year in commands and provenance.
- Update versioned template references in `src/lib/pdf.ts` and `public/sw.js` together. Render every PDF page to check coordinates, glyphs and attachments; review public-asset cache versioning.
- Refresh all three MFA directory categories deliberately. Preserve stable IDs, parent/dependent relationships, separate consulates and office exceptions.
- Review recipients/notices with [maintained decisions](recipient-decisions.md). Preserve real source dates and recipient authorization; rollover must not silently downgrade coverage.
- Repeat the [testing matrix](testing.md) using current data, choosing partial/unconfirmed examples dynamically.
- Update procedures as commands/dependencies change. Remove superseded prose and unreferenced assets after checking continuing use; Git history retains old implementations.
