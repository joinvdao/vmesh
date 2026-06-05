# Testing

Run the relevant checks before handing work back:

```bash
npm run format:check
npm run lint
npm test
npm run agent-ready:check
npm run privacy:check
```

After app entrypoints exist, also run `npm run build` and confirm `npm run dev` serves `http://localhost:3000`.
