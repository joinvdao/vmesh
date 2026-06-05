# Recursive Learning

VMesh is a core VDAO pillar. It must not act as an isolated codebase; it participates in a suite-wide learning loop.

## Pillar Role

geospatial and ecosystem data aggregation layer for end users and downstream products.

## Learning Loop

1. Observe real usage, agent runs, system events, failures, requests, and review findings.
2. Normalize those observations into public-safe records: tests, evals, docs, prompts, tickets, manifests, or audit events.
3. Improve the local pillar from those records.
4. Share reusable learning with the appropriate pillar.
5. Re-run the loop with better defaults, better prompts, better checks, and better source coverage.

## This Pillar Observes

coordinate requests, source discovery runs, STAC/package quality, data gaps, BA worker needs.

## This Pillar Emits

data packages, source manifests, STAC-like catalogs, provenance records, gap reports.

## This Pillar Learns

which source categories, data products, and aggregation strategies make ecosystem intelligence faster and more complete.

## Cross-Pillar Feedback

- VPass receives identity, access, role, badge, and member graph signals.
- VAgents receives agent run patterns, tool gaps, escalation rules, and prompt/playbook improvements.
- VAvatars receives badge/avatar/NFT semantics that should become durable proofs or identity media.
- VGovernance receives proposal, voting, delegation, policy, and decision-process learnings.
- VBuild receives coding workflow, scaffold, test, deployment, and review learnings.
- VMesh receives geospatial/ecosystem source, package, STAC, and data-gap learnings.
- VWiki receives durable skills, playbooks, explanations, citations, and training material.

## Evidence Discipline

Every meaningful run should state its run class:

- mock: no external provider or live artifact was touched.
- dry-run: inputs or local behavior were validated without live side effects.
- configured: credentials, routes, queues, clients, or schema appear wired, but no retained live artifact proves the workflow.
- live-proof: a real provider or external system produced a retained, reviewable artifact or response under the intended workflow.

## Learning Artifacts

Use these files or equivalent public-safe records:

```text
GOAL.md
PLAN.md
EXPERIMENTS.md
EXPERIMENT_NOTES.md
FEEDBACK.md
docs/IMPLEMENTATION_PROMPT.md
docs/EVALS.md
docs/TICKETS.md
.github/issues and pull requests
```

Do not leave important learning only in chat history.
