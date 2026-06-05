# Macro Package Pipeline Implementation Prompt

You are an expert coding agent working in this repository.

Your task is to build the next vmesh deferred-analysis package pipeline: a source-backed, versioned, testable package path that can remain hidden from the visible UI until analysis layers are deliberately reintroduced.

Do not present mock, decorative, inferred, or fallback data as authoritative. Build the pipeline so every macro value has provenance, timestamp, confidence, limitations, and source status.

## Read First

Before editing code, read:

- `README.md`
- `AGENTS.md`
- `docs/PRODUCT_SCOPE.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/TESTING.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/OPERATIONS.md`
- `docs/DESIGN_DIRECTION.md`
- `docs/IMPROVEMENT_PROMPTS.md`
- `lib/macroSources.ts`
- `lib/climateDataSources.ts`
- `lib/layerCatalog.ts`
- `lib/sourceBroker.ts`
- `lib/sourcePackages.ts`
- `lib/sourceProvenance.ts`
- `lib/h3Mesh.ts`
- `data/mockVmeshData.ts`
- `store/useVmeshStore.ts`
- `components/Map/TerrainGlobe.tsx`
- `components/Map/useTerrainGlobeRenderer.ts`
- `components/Map/useTerrainGlobeLayers.ts`
- `components/Panels/MacroLayersPanel.tsx`
- `components/Panels/SourceProvenancePanel.tsx`

## Product Intent

vmesh is a source-honest geospatial atlas. Visible source layers focus on terrain, imagery, vegetation, and open-map context. Climate, hazard, solar, wind, and weather-derived analysis layers remain deferred.

The next milestone should move from deterministic mock scaffolding toward real macro packages, without jumping straight to broad live provider calls from the browser.

The browser should consume:

- Selected-cell live summaries only when no-secret, privacy-reviewed, and rate-limited.
- Versioned local/server package manifests for deferred analysis layers.
- H3 summary JSON or tile artifacts generated outside the browser.

The browser should not consume:

- Global gridded climate files directly.
- Broad viewport provider queries.
- Paid/token-gated APIs by default.
- Emergency, legal, engineering, or official hazard claims.

## Core Outcome

Build a macro package pipeline that can produce and validate versioned H3 macro summary packages for a bounded AOI and time window.

At minimum, the implementation should support:

- A typed package manifest for macro H3 summaries.
- A deterministic fixture pipeline that can run in CI without network.
- A no-secret Open-Meteo selected-cell or small-capped-ring adapter where appropriate.
- Provider-boundary contracts for NASA POWER, ERA5/CDS, NASA FIRMS, terrain-derived flood/HAND, wind rose, solar access, and climate sector map data.
- Import of generated packages into the existing Zustand/UI flow without removing existing mock fallback behavior.
- Clear UI labels distinguishing `live`, `cached`, `package`, `fixture`, `mock`, `derived`, `fallback`, `future-provider`, and `unavailable`.

## Non-Negotiable Truth Boundaries

- Mock package fixtures must be labeled as fixtures.
- Open-Meteo selected-cell data is weather context, not official warnings.
- Terrain-derived flood is planning context, not authoritative flood mapping.
- Fire-weather or FIRMS-derived signals are context, not emergency alerts.
- Solar access is planning context, not bankable PV engineering.
- Wind roses are climate/design context, not structural wind engineering.
- Sentinel/SEN2SR imagery cannot upgrade terrain, parcel, road, building, or emergency truth.
- H3 is an index and aggregation bucket, not a legal boundary.
- Every package must preserve source ID, provider label, source type, acquisition/model run time, generated time, license, confidence, limitations, and package version.

## Pipeline Design

Create a pipeline boundary that can run locally from npm scripts.

Recommended file structure:

```text
lib/
  macro-packages/
    macroPackages.ts
    macroPackageValidation.ts
    macroPackageFixtures.ts
    macroPackageImport.ts
  macroPackageReview.ts
  macroProviders/
    openMeteoPoint.ts
    nasaPowerBoundary.ts
    era5Boundary.ts
    firmsBoundary.ts
    terrainFloodBoundary.ts
    windRoseBoundary.ts
    solarAccessBoundary.ts
    climateSectorBoundary.ts
scripts/
  build-macro-package.mjs
  validate-macro-package.mjs
tests/
  macroPackages.test.ts
  macroPackageValidation.test.ts
  macroPackageImport.test.ts
  macroVisualContracts.test.ts
fixtures/
  macro-packages/
    western-europe-demo.manifest.json
    western-europe-demo.h3-summary.json
```

Use this structure only if it fits the existing repo cleanly. Keep files under the agent-ready file-size budget.

## Data Contracts

Define a `MacroPackageManifest` with:

- `schemaVersion`
- `packageId`
- `packageVersion`
- `generatedAt`
- `aoi`
- `h3Resolution`
- `h3Tiers`
- `timeWindow`
- `sourceRun`
- `providers`
- `layers`
- `artifacts`
- `summaryStats`
- `qualityGates`
- `privacy`
- `limitations`

Define a `MacroPackageArtifact` with:

- `kind`: `h3-summary-json`, `h3-summary-pmtiles`, `raster-cog`, `vector-pmtiles`, or `manifest-only`
- `path`
- `contentHash`
- `recordCount`
- `h3Resolution`
- `layerIds`
- `generatedAt`

Define a `PackagedMacroCellSummary` that extends existing `MacroCellSummary` with:

- `packageId`
- `packageVersion`
- `sourceType`: include `package` or map package data to `cached` with explicit package metadata
- `qualityFlags`
- `inputVariables`
- `modelRunAt`
- `validFrom`
- `validTo`
- `license`
- `limitations`

Do not break the existing `MacroCellSummary` UI. Add adapters that convert packaged summaries into the current UI model.

## Provider Boundaries

### Open-Meteo

Implement or refine:

- Selected H3 centroid fetch.
- Optional capped local ring fetch, disabled by default.
- Timeout, abort, in-memory cache, fixture mode, and visible fallback.
- Query metadata stored in provenance.
- Tests that use fixed fixture payloads only.

### NASA POWER

Add boundary only unless a fixture exists:

- Solar radiation, temperature, wind, humidity, and precipitation variables.
- No live browser calls.
- Package worker or server/local-hub preprocessing only.
- Terms/citation placeholder in manifest.

### ERA5/CDS

Add boundary only:

- Reanalysis/climate-normal preprocessing path.
- Model run/vintage/time-period metadata.
- No browser fetch.
- No credentials in Git.

### NASA FIRMS

Add boundary only:

- Active-fire observation path.
- Emergency-use limitation.
- Timestamp and satellite/source metadata.
- No live V1 calls.

### Terrain-Derived Flood/HAND

Add boundary only or deterministic fixture:

- DEM source role.
- HAND/flow accumulation method placeholder.
- Lowland/flood exposure summary.
- Explicit non-authoritative limitation.

### Solar, Wind, Sector

Add typed package-ready summaries for:

- `SolarAccessSummary`
- `WindRoseSummary`
- `ClimateSectorMap`

Preserve method, source, period, confidence, and limitation fields. Do not claim final PV output, structural wind safety, or automated design advice.

## Build Script Requirements

Create `npm` scripts if missing:

```json
{
  "macro:build": "node scripts/build-macro-package.mjs",
  "macro:validate": "node scripts/validate-macro-package.mjs"
}
```

The build script must support:

- `--fixture`
- `--aoi fixtures/macro-packages/western-europe-demo.aoi.json` or a small built-in demo AOI
- `--out fixtures/macro-packages`
- `--tier U5`
- `--max-cells 64`
- `--provider open-meteo-fixture`

The default script must not call live providers. Live provider calls require an explicit flag such as `--live` and should still be capped and no-secret.

The validate script must:

- Parse manifest and summary artifact.
- Validate schema version.
- Validate H3 IDs and tier/resolution alignment.
- Validate source/provenance fields.
- Validate confidence range.
- Validate limitations are present.
- Validate no exact private addresses or user PII.
- Validate package AOI is bounded.
- Validate max cell count.
- Validate all referenced artifact paths exist for fixture mode.

## UI Integration

Integrate package metadata into:

- `MacroLayersPanel`
- `SourceProvenancePanel`
- Footer status
- Selected hex macro summary
- Macro map overlays

The UI must make the data mode obvious:

- `Live selected-cell`
- `Fixture package`
- `Cached package`
- `Mock fallback`
- `Future provider`
- `Unavailable`

The user should be able to distinguish:

- Basemap-driven globe shell.
- Operational basemap.
- Source-backed H3 macro overlay.
- Mock/fallback H3 macro overlay.
- Optional imagery visual context.
- Terrain/hillshade derived context.

Do not hide these distinctions behind hover-only UI. At least one persistent status surface must disclose the active mode.

## Visual Regression Requirements

Add visual verification scripts that can run against the local dev server. Prefer the existing browser automation stack in the repo/session.

Create a script such as:

```text
scripts/visual-regression-check.mjs
```

or an equivalent test command:

```json
{
  "visual:check": "node scripts/visual-regression-check.mjs"
}
```

The visual check should verify:

- First viewport is nonblank.
- A globe or explicit fallback surface is visible.
- Canvas pixels are not all black, white, or transparent.
- Footer reports basemap, terrain, macro status, and hex count.
- Selected-cell affordance is visible on first load.
- Source drawer opens and shows source/provenance status.
- Macro panel opens and shows layer modes.
- Enabling a macro H3 layer changes visible pixels or deck layer count.
- No body scroll appears at desktop viewport.
- No console errors during initial load, source drawer open, macro layer toggle, and selected-cell panel open.

Store screenshots under an ignored artifact path such as:

```text
.artifacts/visual/
```

Do not commit screenshots unless they are sanitized fixtures intentionally added for docs/tests.

## Close-Zoom Transition Testing

The app has an `Orbit Globe` to `OSS Map Output` transition. Strengthen this with automated checks.

Test cases:

- Initial zoom stays in `Orbit Globe`.
- Searching an offline known city flies to local view.
- Close zoom switches to `OSS Map Output`.
- The basemap becomes legible after transition.
- The selected H3 cell remains selected through transition.
- Footer updates coordinates and tier/resolution.
- The selected hex panel opens after search/selection.
- Returning to orbit resets mode without changing provider, selected H3, data provenance, or terrain provider.
- U8 is still scoped to selected U5 only after close zoom.
- Body scroll remains disabled.

Add unit tests for `getGlobeViewerMode` if not already sufficient. Add browser checks for the real UI transition.

## Decorative Globe Versus Source-Backed Output

The current globe contains visual texture and lighting that help orientation. That must be explicitly separated from source-backed map and data layers.

Implement one or more of:

- A persistent HUD label showing `Basemap-driven globe shell` versus `Source-backed map output`.
- A data-mode badge in the globe HUD.
- Source drawer entries that list decorative visual treatments separately from basemap, terrain, imagery, and H3 summaries.
- Tests that confirm the text appears in orbit mode and changes in close map mode.

Rules:

- Decorative land/cloud/lattice/rim lighting cannot be described as provider data.
- MapLibre basemap and terrain provider names must remain visible in footer/source UI.
- H3 macro layer mode must remain visible when enabled.
- Imagery must be labeled as visual context unless package-backed and still non-authoritative.

## Testing Requirements

Add or update tests for:

- Macro package manifest validation.
- H3 resolution/tier alignment.
- Package artifact validation.
- Fixture package import into current store/UI shape.
- Open-Meteo fixture parsing and cache behavior.
- Provider-boundary configs for NASA POWER, ERA5/CDS, FIRMS, terrain flood, solar, wind, and sector maps.
- No global U8 generation.
- Privacy checks for package fixtures.
- Visual-mode labels: decorative globe versus source-backed map output.
- Close-zoom transition contract.
- Source drawer mode disclosure.

Tests must not call paid providers or broad live APIs.

## Documentation Updates

Update:

- `README.md`: package commands and macro data modes.
- `docs/SYSTEM_DESIGN.md`: macro package contracts and UI ingestion path.
- `docs/OPERATIONS.md`: package build/validate runbook.
- `docs/TESTING.md`: visual regression and close-zoom checks.
- `docs/SECURITY_PRIVACY.md`: package privacy, AOI, provider call, and fixture rules.
- `docs/USER_GUIDE.md`: how users should read macro modes and decorative/source-backed distinctions.

## Acceptance Criteria

The work is complete when:

- `npm run macro:build -- --fixture` creates a deterministic package.
- `npm run macro:validate -- --fixture` validates it.
- The app can load or reference the fixture package without losing mock fallback behavior.
- Source drawer shows package provenance and limitations.
- Macro panel distinguishes fixture/package/live/mock/future modes.
- Footer reports macro data mode.
- First viewport visual check passes.
- Close-zoom transition visual check passes.
- Decorative lighting/texture cues are explicitly labeled separately from source-backed basemap/map output.
- `U8` remains local/detail only and never global.
- No new secrets, raw PII, private addresses, paid API calls, or downloaded provider artifacts are committed.

## Required Verification

Run:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run macro:build -- --fixture
npm run macro:validate -- --fixture
npm run visual:check
npm run agent-ready:check
npm run public-workflow:check
npm run privacy:check
npm audit --audit-level=moderate
```

Then run:

```bash
npm run dev
```

Browser-verify:

- First viewport is nonblank and has no body scroll.
- Orbit mode clearly labels decorative globe treatment.
- Close search/zoom switches to source-backed map output.
- Source drawer separates decorative visuals, basemap, terrain, imagery, macro package, and mock fallback.
- Macro layer toggle visibly changes the H3 overlay and status.
- Selected hex panel shows package or fallback provenance.
- Console has no uncaught errors.

## Output

When finished, report:

- Files changed.
- Package commands added.
- Package fixture generated.
- Verification commands and results.
- Browser visual verification results.
- Which providers are real, fixture-backed, mock, or future-boundary only.
- Remaining risks before production macro ingestion.
