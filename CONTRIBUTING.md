# Contributing

vmesh is a VDAO.io community project. Contributions should be public-safe, source-reviewed, and aligned with the product docs.

## Public Workflow

Use GitHub Issues as the public ticket system:

- Bug reports use the Bug Report template.
- Product ideas use the Feature Request template.
- Implementation slices use the Engineering Task template.
- Public livestream outcomes use the Livestream Follow-Up template.

Private planning systems, local task lists, and unpublished operational notes stay outside this repository.

## Development

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
```

## Pull Requests

Every pull request should:

- Link a public issue when possible.
- Explain what changed and why.
- Include validation results.
- Avoid unrelated refactors.
- Update docs when product, architecture, operations, privacy, analytics, or workflow behavior changes.

## Privacy And Safety

Do not commit secrets, private notes, personal contact details, exact private addresses, paid-provider credentials, sensitive geospatial records, or unreviewed real-world risk claims.
