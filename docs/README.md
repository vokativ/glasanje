# Project documentation

Start with the [README](../README.md) for registration preparation, optional follow-up and contributor setup, and [AGENTS.md](../AGENTS.md) for domain judgment and working rules.

| Task | Read |
| --- | --- |
| Install Bun, Node.js and Python | [Setup prerequisites](../README.md#потребни-алати-на-новом-рачунару) |
| Understand state, scripts, PDFs and coverage | [Architecture](architecture.md) |
| Collect, review and apply contacts | [Election-contact operations](election-contact-operations.md) |
| Understand maintained recipient exceptions | [Recipient decisions](recipient-decisions.md) |
| Repeat browser, PDF and crawler checks | [Testing checklist](testing.md) |
| Deploy, maintain domains or prepare for another election | [Deployment and maintenance](deployment.md) |
| Follow up on an already-sent registration | Public [Cyrillic human guide](https://korakdoglasa.org/pracenje/), [Latin human guide](https://korakdoglasa.org/pracenje/latin/) and [assistant playbook](https://korakdoglasa.org/pracenje/agent.md) |
| Maintain follow-up content, resources and provider handoff | [Content maintenance contract](architecture.md#follow-up-content-maintenance), [routes and state](architecture.md#routes-and-state-transitions), [privacy boundaries](architecture.md#handoff-and-privacy), [test checklist](testing.md#follow-up-service) |

The public guide supports manual correspondence and an optional external assistant; it does not send requests, monitor mail or establish an individual's application status. Its complete templates come from `content/follow-up/templates.json`, with linked workflow/source/schema resources under `/pracenje/`. Edit the maintained sources and generate them with `bun run build:follow-up`, not the ignored public output. Legal conditions and contacts are verified at use; guide maintenance does not alter the recipient decisions or operational schemas owned above.

Keep these pages about current behavior, procedures and decision rationale. Update the owning page when behavior changes. Do not add dated crawl diaries, deployment hashes, screenshots, pass counts or duplicate recipient tables here.

Current recipients, authorizations and announcement URLs live in the data files; genuine source dates and immutable evidence there remain meaningful provenance. Keep run-specific evidence in ignored `data/election_runs/` or `tmp/`, and describe release validation in a commit or PR. Git history retains retired investigations. Before deleting a document, move still-needed decisions or procedures to their owning page and repair links, including references in data notes.
