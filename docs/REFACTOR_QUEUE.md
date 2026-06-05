# Refactor Queue

Generated queue output can be written here by `npm run refactor:queue`.

Current state: the first macro/imagery milestone was split into smaller type, provider, store-initialization, and renderer-layer modules so the next implementation phase can add providers without expanding the main map and Zustand files.

Watch list:

- Keep `components/Map/TerrainGlobe.tsx` focused on MapLibre lifecycle and globe staging.
- Keep provider adapters out of registry files once they exceed one provider family.
- Keep `store/useVmeshStore.ts` action-focused; move reusable action reducers into helpers if it approaches the agent-ready file budget again.
