# Project documentation

Start with the [README](../README.md) for setup and [AGENTS.md](../AGENTS.md) for domain judgment and working rules.

| Task | Read |
| --- | --- |
| Install Bun, Node.js and Python | [Setup prerequisites](../README.md#потребни-алати-на-новом-рачунару) |
| Understand state, scripts, PDFs and coverage | [Architecture](architecture.md) |
| Collect, review and apply contacts | [Election-contact operations](election-contact-operations.md) |
| Understand maintained recipient exceptions | [Recipient decisions](recipient-decisions.md) |
| Repeat browser, PDF and crawler checks | [Testing checklist](testing.md) |
| Deploy, maintain domains or prepare for another election | [Deployment and maintenance](deployment.md) |

Keep these pages about current behavior, procedures and decision rationale. Update the owning page when behavior changes. Do not add dated crawl diaries, deployment hashes, screenshots, pass counts or duplicate recipient tables here.

Current recipients, authorizations and announcement URLs live in the data files; genuine source dates and immutable evidence there remain meaningful provenance. Keep run-specific evidence in ignored `data/election_runs/` or `tmp/`, and describe release validation in a commit or PR. Git history retains retired investigations. Before deleting a document, move still-needed decisions or procedures to their owning page and repair links, including references in data notes.
