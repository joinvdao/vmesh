# Project Management

## Public Repository Boundary

This repository is intended to be a public open-source codebase. It should contain code, public product documentation, public roadmap material, issues, pull requests, and contribution context that is safe for the VDAO.io community to read.

Private planning systems stay outside this repo.

Do not commit:

- Local ticket folders or private planning exports.
- Private notes, task lists, or planning exports.
- Personal contact details.
- Secrets, provider tokens, paid-service credentials, or local environment files.
- Sensitive geospatial records, private addresses, or unpublished operational context.

## Public Work Tracking

GitHub Issues are the public ticket system for vmesh.

Use GitHub Issues and Pull Requests for public work that can be discussed openly:

- Product roadmap items.
- Implementation tasks.
- Bug reports.
- Provider research that does not include secrets or private agreements.
- Design and architecture discussions.
- Livestream follow-up work from the weekly public build session.

Private planning tools may link to public issues, pull requests, branches, or commits, but the private planning content itself should not be copied into this repository.

## Issue Types

The public repo includes GitHub Issue templates for:

- Bug reports.
- Feature requests.
- Engineering tasks.
- Livestream follow-up notes and action items.

Use the narrowest template that fits the work. If a livestream discussion produces concrete engineering work, create a dedicated Engineering Task and link it from the livestream follow-up issue.

## Local Planning

Contributors may use any local system they prefer. Keep local ticket boards and planning exports outside the public Git index.

If a planning artifact should become public, convert it into a clean GitHub Issue or public doc first. Review it for personal data, local paths, private commitments, private provider details, and security-sensitive information before committing.

## Cross-App Insight Sharing

vmesh may publish public-safe substrate insights for downstream apps, but each app keeps its own code, issues, docs, and release path.

Use `docs/CROSS_REPO_INSIGHTS.md` for reusable lessons that are safe to disclose:

- map-stack and renderer research
- provider/source metadata
- schema or fixture ideas
- fidelity/provenance rules
- playbook and hub concepts
- public issue links across repos or apps

Do not copy private planning context between repos. If a local or private note produces a public insight, rewrite it as a clean summary first. Every cross-app item should be reviewed for secrets, private locations, personal data, paid-provider commitments, license restrictions, and terms-uncleared property data.

When an insight needs implementation in more than one repo, create one issue in each affected public repo and link them. Avoid creating a shared package until the same stable contract is needed by at least two apps.
