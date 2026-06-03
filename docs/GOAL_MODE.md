# Goal Mode Doctrine

Goal/loop mode is for bounded autonomous work, not open-ended "make it better" prompts. Treat extra token budget as search bandwidth, not guaranteed labor. Without a scoreboard and a clear telos, long-running agents tend to produce process, gates, reports, and todo lists instead of meaningful progress.

## Core Principle

Every long-running goal needs:

- a telos: the real purpose of the work, not only the visible task
- a measurable target or checklist
- a baseline score or starting state
- explicit scope and non-scope
- validation commands or scoring scripts
- a fast feedback loop
- stop conditions
- a checkpoint interval
- progress files that survive context compaction

## Autonomy Horizon

Single-agent unattended loops have a limited useful horizon. Use shorter horizons by default:

- 30 minutes to 2 hours for exploratory implementation
- 2 to 8 hours for well-scored refactors, eval work, or benchmark improvement
- up to 24 hours only when there is a strong objective scoreboard and clear stop conditions

Longer runs should re-ground periodically. At each checkpoint, the agent should answer:

- Did the primary score improve?
- Did validation pass?
- Did this work advance the telos?
- What was learned?
- What will be tried next?
- Should the loop stop, narrow, broaden, or escalate?

If the score is not improving and the next experiment is not concrete, stop the loop and write a blocker.

## Telos

Write the telos at the top of `GOAL.md` or `SPRINT.md`.

Examples:

- Bad: "Build the simulator."
- Better: "Build enough simulator fidelity to answer whether strategy changes improve outcome X without increasing false positives."
- Bad: "Improve the code."
- Better: "Reduce runtime of `specific_file` by 20% while `npm test` and `npm run run-evals` pass."

The agent should explicitly connect major actions to the telos. If it cannot, the action is probably busywork.

## Required Progress Files

For long-running work, create or update:

```text
GOAL.md              measurable target, telos, baseline, constraints, stop conditions
PLAN.md              current strategy and ordered work plan
EXPERIMENTS.md       curated attempts, changes, scores, outcomes, and decisions
EXPERIMENT_NOTES.md  chronological scratchpad and observations
FEEDBACK.md          manager or reviewer feedback when multi-agent work is used
```

Repo-local sprint tickets may replace these files if they contain the same sections.

## Scoreboards

Use the tightest reliable feedback loop available:

- unit tests or integration tests
- eval harness score
- benchmark runtime
- leaderboard score with holdout protection
- checklist completion count
- error rate, latency, cost, or coverage
- small representative dataset before full-scale runs

The feedback loop should be fast enough that the agent can run it after each meaningful change.

## Avoid Busywork Drift

Agents can devolve into "working correctly" while missing the point. Watch for:

- inventing new process instead of advancing the score
- writing tests for scaffolding that does not matter
- making todo lists about todo lists
- adding gates that do not protect the telos
- broad documentation churn without product or score movement
- large insertions with little deletion, simplification, or measurable improvement

When this happens, stop and re-ground on the telos, score, and next concrete experiment.

## Breadth, Selection, Depth

Large token budgets are most useful for breadth when objective selection pressure exists.

Use this pattern for hard search spaces:

```text
Breadth:
  multiple agents try diverse approaches in separate branches, worktrees, or bounded tasks

Selection:
  a manager reviews scores, diffs, validation output, and failure modes

Depth:
  one or two agents integrate the best ideas, harden tests, document decisions, and remove dead ends
```

Do not merge all attempts. Select, combine, and simplify.

## Manager Agent

A manager agent is useful when it judges artifacts, not vibes. It should read:

- `GOAL.md`
- `EXPERIMENTS.md`
- `FEEDBACK.md`
- validation logs
- benchmark or eval outputs
- leaderboard submissions when relevant
- git diffs
- open blockers

The manager should write concise feedback into `FEEDBACK.md`, including:

- which attempts are promising
- which agents are stuck
- which approaches look like metric gaming
- what to broaden, narrow, abandon, or double down on
- the next checkpoint target

## Eval Integrity And Anti-Gaming

When a leaderboard, eval, benchmark, or metric is the scoreboard, explicitly guard against metric gaming.

Require:

- holdout or hidden evals where possible
- no leakage from validation data into training, prompts, fixtures, or heuristics
- no hardcoded answers to public cases
- ablations for suspicious improvements
- robustness checks across multiple seeds, fixtures, or representative slices
- a `SUSPECTED_P_HACKS.md` or section in `EXPERIMENTS.md` when incentives are strong

Reward robust, simple improvements over fragile score hacks.

## Codex `/goal` Launch Pattern

When Codex supports `/goal`, use:

```text
/goal Achieve <quantitative target> in <scope> without regressing <tests/evals>. Telos: <real purpose>. Before editing, create or update GOAL.md, PLAN.md, EXPERIMENTS.md, EXPERIMENT_NOTES.md, and FEEDBACK.md if a manager is involved. Use <validation command> as the scoring loop. Re-ground every <checkpoint interval>. Stop when all acceptance criteria pass, when the target is proven impossible under the constraints, or when the documented time/token/cost ceiling is reached.
```

For other agents:

```text
Loop until <quantitative target> is met in <scope> without regressing <tests/evals>. Telos: <real purpose>. Persist progress in GOAL.md, PLAN.md, EXPERIMENTS.md, EXPERIMENT_NOTES.md, and FEEDBACK.md if a manager is involved. Run <validation command> after each meaningful change. Re-ground every <checkpoint interval>. Stop when all acceptance criteria pass or when the documented ceiling/blocker is reached.
```

## Completion Standard

A loop is complete when:

- the target score or checklist is satisfied
- required validation passes
- the agent has recorded what changed and why
- dead-end attempts are summarized or removed
- follow-up risks are explicit
- no private local context, secrets, or irrelevant planning notes were written into repo files

If the loop stops because the target is impossible or the ceiling was reached, write the evidence and the next decision needed.
