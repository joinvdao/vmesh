# Sprint Tickets

Repo-local sprint tickets are optional execution records for turning a public-safe goal into a sprint with multiple implementation steps. They are useful when GitHub Issues are too coarse for day-to-day agent work, but they must never become a private planning system.

## Purpose

Use sprint tickets to capture:

- a sprint goal
- scoped implementation steps
- acceptance criteria
- validation commands
- blockers and follow-up decisions
- links back to public GitHub Issues and pull requests when available

Public GitHub Issues remain the shared roadmap and contribution surface. Repo-local sprint tickets are the working breakdown for a specific sprint or implementation pass.

## Goal / Loop Mode

Sprint tickets are the preferred place to prepare long-running agent loops. A loop-ready sprint should include:

- a quantitative or checklist-based goal
- the current baseline when measurable
- explicit scope and non-scope
- acceptance criteria that can be checked off
- validation commands or scoring scripts
- a fast feedback loop, such as targeted tests, evals, smoke tests, fixtures, benchmarks, or small datasets
- a time, token, cost, or iteration ceiling
- stop conditions for success, impossibility, or escalation

Use `docs/GOAL_MODE.md` as the deeper source of truth for autonomy horizons, telos, manager-agent feedback, breadth/selection/depth swarms, and anti-metric-gaming rules.

For Codex, the sprint can be launched with `/goal` when available:

```text
/goal Achieve <target> in <scope> without regressing <tests/evals>. Use this sprint's SPRINT.md and STEP files as the source of truth. Update progress after each meaningful attempt. Stop when all acceptance criteria pass or when the documented ceiling/blocker is reached.
```

For other agents, use the same content as a normal loop prompt:

```text
Loop until <target> is achieved in <scope> without regressing <tests/evals>. Use this sprint's SPRINT.md and STEP files as the source of truth. Update progress after each meaningful attempt. Stop when all acceptance criteria pass or when the documented ceiling/blocker is reached.
```

For research-heavy or optimization-heavy goals, add these files inside the sprint folder:

```text
GOAL.md
PLAN.md
EXPERIMENTS.md
EXPERIMENT_NOTES.md
```

Do not use goal/loop mode for vague requests such as "make the app better." Rewrite them as measurable targets or checklist completion goals first.

When a sprint uses a leaderboard, eval, benchmark, or other scoreboard, add a short eval-integrity section to `SPRINT.md` or `EXPERIMENTS.md` covering holdouts, leakage risks, suspicious improvements, and anti-p-hacking rules.

## Dream Audit Tickets

Use a dream audit when the goal is to notice maintenance drift without changing source files. A dream audit is a passive, resumable sweep that writes state to `.dream/` and produces a review queue at `.dream/review.md`.

Good triggers:

- `dream on this repo`
- `run a passive audit`
- `find doc/code drift`
- `find stale TODOs`
- `find missing tests`

Dream audit stages:

1. Inventory files in scope while respecting `.gitignore`, `.agentignore`, dependencies, build outputs, env files, generated files, large files, and binaries.
2. Scout each file for stale TODOs, doc/code drift, missing tests, dead references, confusing code, and undocumented public APIs.
3. Pair-scout docs against related code and code against likely tests.
4. Filter noisy findings with a stronger review pass.
5. Write grouped findings, quiet zones, skipped files, and suggested actions to `.dream/review.md`.

Agents must not edit source files during the dream pass. Acting on dream findings should become a separate sprint, issue, or implementation prompt.

Recommended state files:

```text
.dream/manifest.json
.dream/queue.json
.dream/pairs.json
.dream/findings/
.dream/filtered/
.dream/review.md
.dream/log.md
.dream/status.json
```

## Suggested Structure

```text
repo-local-sprints/
  README.md
  sprints/
    2026-05-example-sprint/
      SPRINT.md
      STEP-001-example.md
      STEP-002-example.md
```

Use short, stable names. Prefer dates or sprint slugs over personal names.

## Sprint File

Each sprint should have a `SPRINT.md` file:

```md
# Sprint: <short public-safe name>

## Goal

<One clear outcome this sprint should achieve.>

## Scope

- <Included work>
- <Explicitly excluded work>

## Steps

- [ ] STEP-001 <title>
- [ ] STEP-002 <title>

## Acceptance Criteria

- <Observable completion condition>
- <Validation command or review condition>

## Links

- Issue: #
- Pull request: #
```

## Step File

Each step should be independently executable:

```md
# STEP-001 <title>

## Goal

<One concrete task.>

## Context

<Public-safe context needed to do the work.>

## Files Likely Touched

- `<path>`

## Acceptance Criteria

- <Expected behavior or artifact>

## Validation

- `<command>`

## Status

Todo

## Notes

<Public-safe blockers, decisions, or follow-ups.>
```

## Status Values

Use these statuses:

- `Todo`
- `Doing`
- `Blocked`
- `Review`
- `Done`

Do not encode private urgency, personal commitments, or sensitive context in status names.

## Privacy Rules

Never put these in sprint tickets:

- secrets, API keys, provider tokens, or credentials
- private planning context
- personal contact details
- exact local machine paths
- private addresses or sensitive location details
- unpublished contracts, agreements, or security-sensitive infrastructure details
- real user data or support records

If a ticket needs sensitive context, replace it with a public-safe placeholder and keep the private source outside the repo.

## Agent Workflow

Agents should:

- read `SPRINT.md` before starting a step
- update only the step they are actively working on
- keep acceptance criteria and validation commands current
- link related issues and pull requests
- mark a step `Done` only after validation passes or the skipped validation is explained
- avoid creating tickets for vague ideas that are not ready for execution
