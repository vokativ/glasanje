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

`firebase.json` serves `dist/glasanje` with SPA rewrites and cache/security headers. Vite builds from root `index.html`. Publishing raw repository files is not a working deployment.

## Release procedure

1. Read `AGENTS.md`, verify the Firebase project/alias and confirm the scope is authorized. Existing conversation authorization remains valid.
2. Obtain the last deployed public dataset from a verified release snapshot or live application artifact. Record URL, fetch time and hash in a local release directory. Neither the branch nor an arbitrary local build establishes what is deployed.
3. Run `bun run build:data`. Compare every stable station ID: removals, old/new email, old/new approval, resolved non-resident entries and total usable recipients. Report distinct-country counts separately. Follow the exact loss gate in `AGENTS.md`; a gain elsewhere cannot offset a loss. Stop on missing baseline or unauthorized loss.
4. Run relevant [testing checks](testing.md), then `bun run build`. Keep logs, screenshots, rendered PDFs and baseline snapshots in ignored `tmp/`, not `public/` or maintained docs.
5. Deploy the checked build to the verified target:

```bash
firebase deploy --only hosting --project YOUR_VERIFIED_PROJECT_OR_ALIAS
```

6. Fetch live HTML and referenced assets from the Firebase hostname and public domain; compare them with the local build. Browser-check `/`, `/status`, both scripts, country continuation, notice links and resource readiness.
7. Recheck domains/redirects after hosting changes. Record release results in the commit/PR or local release record, not a growing diary here.

Keep a verified snapshot of the latest successful release until its replacement is independently verified. That snapshot is input to the next deployment, even though old pass counts are not maintained documentation.

## Domain maintenance

For each domain inspect authoritative nameservers, HTTPS certificates, response/redirect destination, application assets and `/status`. When changing redirects, test paths and queries, including `?script=latin` and country-entry parameters.

For new or repaired custom domains use the current [Firebase procedure](https://firebase.google.com/docs/hosting/custom-domain) and exact generated records. Preserve unrelated mail and verification records. Inspect existing [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/) rather than toggling it by assumption. Normal application releases need no DNS change.

## Preparing for another election

- Verify the official form, election date, registration deadline and source links. Do not relabel old notices as current.
- Review `src/components/Countdown.tsx`, `src/lib/missionInquiry.ts`, export/invitation copy, README and election ID/year in commands and provenance.
- Update versioned template references in `src/lib/pdf.ts` and `public/sw.js` together. Render every PDF page to check coordinates, glyphs and attachments; review public-asset cache versioning.
- Refresh all three MFA directory categories deliberately. Preserve stable IDs, parent/dependent relationships, separate consulates and office exceptions.
- Review recipients/notices with [maintained decisions](recipient-decisions.md). Preserve real source dates and recipient authorization; rollover must not silently downgrade coverage.
- Repeat the [testing matrix](testing.md) using current data, choosing partial/unconfirmed examples dynamically.
- Update procedures as commands/dependencies change. Remove superseded prose and unreferenced assets after checking continuing use; Git history retains old implementations.
