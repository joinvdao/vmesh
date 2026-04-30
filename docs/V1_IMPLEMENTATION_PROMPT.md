# V1 Implementation Prompt

You are an expert coding agent working in this repository.

Your task is to build `vmesh` V1: a polished, working, browser-verifiable geospatial atlas of antifragility. V1 must show a visible globe on first load and must include production-quality plumbing for an H3 mesh overlay, including U3/U5/U8 mesh tiers. It does not need real provider ingestion or persistent accounts yet.

Do not build a marketing page. Build the app.

## Read First

Before editing code, read:

- `README.md`
- `AGENTS.md`
- `docs/PRODUCT_SCOPE.md`
- `docs/DESIGN_DIRECTION.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/TESTING.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/OPERATIONS.md`
- `docs/ANALYTICS.md`
- `docs/PROJECT_MANAGEMENT.md`

## Product Intent

vmesh is an atlas of antifragility. The core interface is a geospatial mesh where each H3 hex can hold:

- Macro data: climate, water, energy, biodiversity, infrastructure, hazard/risk, land use.
- Micro data: properties for sale, farmers markets, growers, local producers, food-system assets, repair capacity, community hubs, and local observations.
- User-added data: private notes, corrections, links, custom records, and local assessments.

The user should be able to open the app, see a real globe, see an H3 mesh overlay, select a hex, and understand that the selected mesh cell can aggregate macro, micro, and user-added context.

## V1 Definition

V1 is complete when:

- The app starts with `npm run dev` and opens at `http://localhost:3000`.
- A MapLibre globe is visible on first load.
- The globe has a terrain-aware setup path with graceful fallback if DEM tiles fail.
- A deck.gl `MapboxOverlay` is attached to the MapLibre instance.
- An H3 mesh overlay renders above the globe using deck.gl.
- U3/U5/U8 mesh tiers exist in typed state and can be switched from the UI.
- U3 and U5 are safe to render at broad extents.
- U8 is implemented as local/detail plumbing only and must not render globally.
- Selecting a hex updates the right panel through Zustand.
- Hovering a hex updates tooltip state through Zustand.
- Bottom analytics and selected-hex panels render from the same typed mock data model.
- User-added data has local/mock plumbing, typed records, validation boundaries, and UI affordances, but no real persistence.
- No body scrolling occurs; contained panels may scroll.
- No secrets, paid provider calls, real scraped listings, raw PII, or unlicensed datasets are introduced.

## Mesh Tier Model

Implement these tiers explicitly. Use `U3`, `U5`, and `U8` as product-facing labels while mapping them to H3 resolutions.

| Tier | H3 resolution | Meaning                           | V1 behavior                                                       |
| ---- | ------------: | --------------------------------- | ----------------------------------------------------------------- |
| `U3` |             3 | Global and continental macro mesh | Render coarse global/regional context.                            |
| `U5` |             5 | Regional operating mesh           | Default selected tier and main dashboard layer.                   |
| `U8` |             8 | Local/detail mesh                 | Generate/render only inside selected or focused U5 parent bounds. |

Rules:

- Never generate or render U8 globally.
- Keep visible hex count bounded and expose it in the footer.
- Parent/child relationships must be explicit through h3-js helpers.
- Selecting a U3 hex should be able to derive child U5 candidates.
- Selecting a U5 hex should be able to derive child U8 candidates for local detail.
- Store selected tier, selected hex ID, hovered hex info, visible hex count, and tier metadata in Zustand.
- Use memoized selectors or derived helpers so layer updates do not recreate expensive data unnecessarily.

## Technical Stack

Use the dependencies already installed in this repo:

- Next.js App Router with React and TypeScript.
- Tailwind CSS with exact arbitrary values where needed.
- shadcn/ui/Radix primitives for base components.
- MapLibre GL v4 with globe projection.
- Open/no-token basemap path where possible.
- Open raster-dem terrain source path, with documented fallback.
- deck.gl `MapboxOverlay` from `@deck.gl/mapbox`.
- deck.gl `H3HexagonLayer`.
- h3-js for H3 indexing, parent/child, boundary, and neighbor helpers.
- Zustand as the single source of truth for map/UI/mesh state.
- Recharts for analytics panels.
- lucide-react for icons.

## Required File Structure

Create or update these files. Keep implementation modular.

```text
app/
  globals.css
  layout.tsx
  page.tsx

components/
  Layout/
    AppFooter.tsx
    AppHeader.tsx
    AppShell.tsx
    AppSidebar.tsx
  Map/
    TerrainGlobe.tsx
    MapControls.tsx
    MeshLegend.tsx
    MeshTooltip.tsx
  Panels/
    BottomAnalytics.tsx
    LayerScaleControl.tsx
    SelectedHexCard.tsx
    UserDataPanel.tsx
  ui/
    button.tsx
    card.tsx
    badge.tsx
    input.tsx
    separator.tsx
    slider.tsx
    tabs.tsx
    tooltip.tsx

data/
  mockVmeshData.ts

lib/
  h3Mesh.ts
  meshScoring.ts
  terrainSources.ts
  utils.ts

store/
  useVmeshStore.ts

tests/
  h3Mesh.test.ts
  meshScoring.test.ts
  vmeshStore.test.ts
```

Add more files only when they keep boundaries clearer.

## Layout Requirements

Match `docs/DESIGN_DIRECTION.md`.

The first viewport must be the working dashboard:

- Root body and app shell: `h-screen w-screen overflow-hidden`.
- Header: `h-16`, white background, thin bottom border, centered search, right controls.
- Sidebar: fixed `w-64`, white background, vertical nav, user block, system status with uptime `99.98%`.
- Map canvas: absolute/flex fill behind overlays, not in a card.
- Floating map tools: left side of map, icon buttons with tooltips.
- Macro-to-micro layer control: vertical control near right side of map.
- Right panel: `w-80`, absolute/fixed right, frosted `bg-white/90`, selected hex details.
- Bottom dashboard: `h-72`, fixed above footer, horizontal analytics strip.
- Footer: `h-10`, coordinate readouts, elevation placeholder, H3 tier, H3 resolution, visible hex count, freshness, version/status.

Use `vmesh` branding and `Atlas of Antifragility`; do not reuse the screenshot product name.

## Map And Globe Requirements

Implement `components/Map/TerrainGlobe.tsx` carefully.

Required behavior:

- Initialize MapLibre once on mount using a `ref`.
- Use `projection: "globe"`.
- Use a light operational style by default.
- If external basemap tiles are unavailable, the app must still show a nonblank globe container with graceful status messaging.
- Configure a raster-dem terrain source through `lib/terrainSources.ts`.
- Call `map.setTerrain({ source: "terrain-source", exaggeration: 1.5 })` when the terrain source is available.
- Add sky/atmosphere/light settings where MapLibre supports them.
- Create a `MapboxOverlay` from `@deck.gl/mapbox`.
- Add the overlay with `map.addControl(overlay)`.
- Keep the overlay layers derived from Zustand and memoized.
- Clean up overlay and MapLibre instance on unmount.
- Handle WebGL/map errors in state instead of crashing React.

Visible-globe acceptance:

- On first load, the user must see a globe-like map surface or explicit map fallback surface within the central canvas.
- The central map area must never be blank white/black without an error state.
- Browser verification must include a screenshot or explicit visual check.

## Mesh Overlay Requirements

Use deck.gl `H3HexagonLayer`.

Layer data should come from typed records, not ad hoc object literals inside the renderer.

Each mesh cell must include:

- `h3Id`
- `tier`
- `resolution`
- `label`
- `placeName`
- `antifragilityScore`
- macro pillars: climate, water, energy, biodiversity, infrastructure, risk
- micro summary: properties, farmersMarkets, growers, communityAssets, localServices
- user summary: privateNotes, observations, corrections
- provenance summary
- confidence score
- trend series

Layer behavior:

- `getHexagon: d => d.h3Id`
- Fill color scales from low-fragility amber/sand through teal to bright mint for high antifragility.
- Selected hex has a clear outline or companion highlight layer.
- Hovered hex shows a tooltip with H3 ID, place name, tier, and score.
- `pickable: true`
- `onHover` updates Zustand `hoveredHexInfo`.
- `onClick` updates Zustand `selectedHexId`, selected tier if needed, and flies the MapLibre camera to the hex center.
- U3/U5 layer changes should be instant with mock data volumes.
- U8 local layer should generate child cells for the selected U5 only and should be clearly marked as local/detail.

## Store Requirements

Create `store/useVmeshStore.ts` with explicit interfaces.

State must include:

- `viewState`
- `selectedHexId`
- `selectedTier`
- `hoveredHexInfo`
- `globalResolution`
- `visibleHexCount`
- `activeLayers`
- `layerScale`: macro-to-micro slider value
- `meshTiers`
- `hexDataByTier`
- `selectedHexDetails`
- `userRecords`
- `draftUserRecord`
- `mapStatus`
- `dataFreshness`

Actions must include:

- `setViewState`
- `selectHex`
- `setHoveredHexInfo`
- `setSelectedTier`
- `setLayerEnabled`
- `setLayerScale`
- `setVisibleHexCount`
- `addUserRecord`
- `updateDraftUserRecord`
- `clearDraftUserRecord`
- `setMapStatus`

The store is the single source of truth. React panels must not maintain separate selected-hex state.

## Data Requirements

Create `data/mockVmeshData.ts`.

Include:

- At least 12 U3 records.
- At least 20 U5 records focused around Western Europe/Iberia.
- U8 child generation for the selected/default U5 cell using h3-js, capped to a safe local count.
- At least 8 user-added mock/local records attached to different H3 cells.
- Trend data for charts.
- Provenance metadata for every app-provided dataset.

Use fictional or clearly public/generic micro records. Do not include real scraped property listings.

## Panels

### SelectedHexCard

Render from Zustand only.

Must show:

- H3 ID, tier, place label.
- Main antifragility score.
- Status badge, for example `High Antifragility`.
- Recharts 5-year trend sparkline.
- Macro pillars: Climate, Energy, Water, Infrastructure, Biodiversity, Risk.
- Micro assets summary.
- User-added records summary.
- Provenance/confidence row.
- Actions: focus, bookmark, more.

### BottomAnalytics

Use Recharts and CSS where appropriate.

Include:

- Top antifragile regions.
- Climate trend LineChart from 1990 to 2040.
- Energy radial progress showing `74% High`.
- Water gauge showing `2.6 Medium`.
- Land-use PieChart with Forest 36%, Agriculture 28%, Grassland 17%, Urban 11%, Other 8%.
- Micro assets card.
- User-added records/provenance card.
- vmesh advisor/notes card that is clearly local/mock and does not imply live AI provider calls.

### UserDataPanel

Add a compact V1 affordance for user-added data:

- Category selector.
- Title field.
- Visibility indicator defaulting to private/local.
- Attach-to-selected-hex behavior.
- Save to local/mock Zustand state.
- Validation for required title/category.

This can be a small panel, drawer, or card. It must not persist to a backend.

## Utility Requirements

Create tested helpers:

- `lib/h3Mesh.ts`: tier definitions, parent/child helpers, center lookup, neighbor lookup, U8 cap logic.
- `lib/meshScoring.ts`: score normalization, color interpolation, status label derivation.
- `lib/terrainSources.ts`: terrain/basemap source configuration and fallback metadata.

## Testing Requirements

Add focused tests for:

- U3/U5/U8 tier mapping.
- U8 generation is capped and scoped to selected parent.
- Parent/child derivation uses h3-js correctly.
- Antifragility score status labels.
- Color interpolation output shape.
- Zustand store selection and user-record actions.

Tests must not call live providers.

## Documentation Updates

Update docs if implementation changes the plan:

- `README.md`: actual local commands and URL.
- `docs/SYSTEM_DESIGN.md`: implemented state/data/renderer contracts.
- `docs/TESTING.md`: verification notes.
- `docs/OPERATIONS.md`: map/terrain fallback and provider notes.
- `docs/SECURITY_PRIVACY.md`: user-added data behavior.
- `docs/ANALYTICS.md`: implemented event stubs, if any.

## Required Verification

Run:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run privacy:check
npm audit --audit-level=moderate
```

Then start:

```bash
npm run dev
```

Verify in browser at `http://localhost:3000`:

- Globe/map area is visible and nonblank.
- H3 mesh overlay is visible.
- U3/U5/U8 tier UI exists and changes state.
- U8 does not render globally.
- Hover tooltip updates.
- Clicking a hex updates selected panel.
- Bottom analytics render.
- User-added local/mock record can be added to the selected hex.
- Body does not scroll.
- Console has no uncaught errors.

## Output

When finished, report:

- Files changed.
- Verification commands and results.
- Browser verification result.
- Any map/terrain provider fallback used.
- Remaining risks or decisions before real data ingestion.

Build V1 completely. Do not stop after scaffolding unless blocked by a concrete technical failure.
