# Implementation Prompt

You are an expert coding agent working in this repository.

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

Build the first MVP slice for `vmesh`, a source-honest geospatial atlas built around an H3 mesh overlay. The experience should show a polished 3D geospatial dashboard where each hex can hold source-backed terrain, imagery, open-map context, local records, and user-added records. Climate, hazard, solar, wind, and similar analysis outputs are deferred from the visible workflow.

Use `docs/DESIGN_DIRECTION.md` as the visual target. The first screen should resemble a light, operational geospatial cockpit: left navigation, top search/header controls, globe-first H3 mesh map, floating map tools, macro-to-micro layer control, right selected-hex panel, bottom data overview strip, and footer telemetry.

## MVP Slice

Create the complete React/Next.js implementation for the initial dashboard shell and mock geospatial experience.

Use this stack:

- Next.js App Router with React and TypeScript.
- Tailwind CSS with exact arbitrary color values where needed.
- shadcn/ui/Radix primitives for base components.
- MapLibre GL v4 with globe projection.
- Open raster-dem terrain tiles in a MapLibre `raster-dem` source.
- deck.gl `MapboxOverlay` from `@deck.gl/mapbox`.
- deck.gl `H3HexagonLayer`.
- h3-js for H3 utilities.
- Zustand as the single source of truth for map/UI state.
- lucide-react for icons.

## Required Files

Create or update these files without collapsing the implementation into one large file:

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `store/useVmeshStore.ts`
- `components/Map/TerrainGlobe.tsx`
- `components/Panels/SelectedHexCard.tsx`
- `components/Panels/BottomDataOverview.tsx`
- `components/Panels/LayerScaleControl.tsx`
- `components/Layout/AppSidebar.tsx`
- `components/Layout/AppHeader.tsx`
- `components/Layout/AppFooter.tsx`
- `components/ui/*` as needed for shadcn-compatible primitives
- `lib/utils.ts`
- focused tests under `tests/`

## Store Requirements

Create a typed Zustand store that includes:

- `viewState`: longitude, latitude, zoom, pitch, bearing.
- `selectedHexId`: default to `89283083fffffff` unless a better vmesh Western Europe/Iberia seed is chosen and documented.
- `hoveredHexInfo`: H3 ID and pointer coordinates.
- `globalResolution`: default `5`.
- `activeLayers`: macro, micro, user-added, terrain.
- `hexData`: mock dictionary of about 20 H3 IDs focused around Western Europe/Iberia.
- Each hex should include micro asset counts, source/provenance fields, confidence, and local/user context.
- `userRecords`: local/mock user-added records with category, title, H3 binding, visibility, confidence, provenance, and timestamp.

## Layout Requirements

Create an app-like fixed layout with no body scrolling:

- Root: `h-screen w-screen overflow-hidden`.
- Header: `h-16`, white background, thin bottom border, centered search, right controls.
- Sidebar: `w-64`, white background, vertical navigation, system status with uptime `99.98%`.
- Map canvas: absolutely positioned under UI overlays.
- Right panel: `w-80`, absolute right, backdrop blur, `bg-white/90`, selected hex details.
- Bottom dashboard: `h-72`, absolute bottom above footer, horizontally scrollable source/data overview cards.
- Footer: `h-10`, coordinate readouts and global H3 resolution stats.

## Renderer Requirements

Implement `components/Map/TerrainGlobe.tsx` with:

- React refs for map container and map instance.
- MapLibre initialization on mount.
- `projection: "globe"`.
- Minimal dark vector basemap style.
- Open raster-dem terrain source representing the Mapterhorn-style terrain path.
- `map.setTerrain({ source: "terrain-source", exaggeration: 1.5 })`.
- `MapboxOverlay` from `@deck.gl/mapbox`.
- `H3HexagonLayer` using Zustand `hexData`.
- `getHexagon: d => d.h3Id`.
- Fill color scale from dark teal `[13, 110, 105]` to bright mint `[165, 230, 203]`.
- `extruded: true`.
- Use stable visual elevation only for selected/source-linked cells.
- `pickable: true`.
- `onHover` updates Zustand hover state.
- `onClick` updates selected H3 ID and triggers MapLibre fly-to.
- Proper cleanup for MapLibre and deck.gl controls.

## Panels

`SelectedHexCard` must react to `selectedHexId` and show:

- Source package summary and provenance.
- Source layer availability.
- Micro assets: property listings, farmers markets, growers, community assets.
- User-added record count and visibility summary.

`BottomDataOverview` must include:

- Land-use PieChart with Forest 36%, Agriculture 28%, Grassland 17%, Urban 11%, Other 8%.
- Additional cards for micro assets, user-added records, and confidence/provenance.

## Constraints

- Preserve all hard constraints in `AGENTS.md`.
- Follow Red-Green-Refactor.
- Prefer small, focused files.
- Add or update tests for changed behavior.
- Do not introduce hidden provider spend, secret exposure, telemetry PII, or real scraped listing data.
- Keep user-added data local/mock unless persistence is explicitly approved.
- Update docs when product, system, privacy, operations, or telemetry behavior changes.

## Required Verification

Run:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run agent-ready:check
npm run privacy:check
```

Then start:

```bash
npm run dev
```

Verify the app in a browser at `http://localhost:3000`, checking that the map renders, the deck.gl H3 overlay appears, panels update from Zustand, no body scrolling occurs, and no console errors are present.

## Output

- Implement the MVP slice.
- Summarize changed files.
- Summarize verification results.
- List remaining risks or follow-up decisions.

Review and edit this implementation prompt. When it is correct, reply `proceed` and I will execute it.
