# Bootstrap Workflow Evals

Run the local eval harness before changing the bootstrap prompt, privacy boundaries, provider abstraction guidance, caching guidance, or outbound payload requirements.

```sh
npm run run-evals
```

The harness is intentionally small and dependency-free. Cases live in `evals/cases/*.jsonl` and assert that required bootstrap guidance remains present in the repository.

## Adding Cases

Each JSONL line should include:

- `id`: stable eval identifier
- `file`: repository-relative file to inspect, unless using `scope: "repo"`
- `scope`: optional; use `"repo"` to scan text files across the repository
- `includes`: required strings
- `excludes`: forbidden strings, when useful
- `excludesCodepoints`: optional forbidden strings encoded as codepoint arrays when the literal text should not appear in the repo

Prefer precise strings that represent durable requirements instead of broad prose fragments.

Repo-wide scans skip `.git`, local agent/editor state, dependencies, build outputs, coverage, env files, generated reports, lockfiles, and eval case definitions so public privacy checks can define forbidden markers without matching themselves.

`evalroom` integrations should stay optional. The required baseline is always:

```sh
npm run run-evals
```
