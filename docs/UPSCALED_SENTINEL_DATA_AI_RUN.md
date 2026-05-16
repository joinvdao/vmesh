# Upscaled Sentinel Data AI Run

Snapshot date: 2026-05-16

This note defines a separate vmesh product track for a community-run Sentinel
upscaling experiment. The working product name is `vmesh DR1 Community`.

The goal is to turn open Sentinel-2 imagery plus open orthophoto/aerial training
data into an AI-inferred `1 m` visual layer that can be requested, cached, and
viewed in vmesh. It is not intended to be ground truth, survey-grade imagery, a
legal parcel source, or proof of small object presence.

## Product Position

| Layer                        |   Resolution target | Role                                | Truth status                                       |
| ---------------------------- | ------------------: | ----------------------------------- | -------------------------------------------------- |
| Sentinel-2 L2A               | `10 m` native bands | Open source input imagery           | Observed satellite source.                         |
| SEN2SR/OpenSR                |             `2.5 m` | Standard vmesh visual context       | AI-enhanced imagery-inferred context.              |
| vmesh DR1 Community          | `1 m` visual target | Experimental community visual layer | AI-inferred visual layer, not measured imagery.    |
| Premium orthophoto/satellite |     Provider-native | High-trust premium source           | Only as strong as provider license and provenance. |

DR1 Community should be claimable as a generated vmesh artifact only when every
tile carries provenance, model version, source dates, confidence flags, and a
clear non-ground-truth label.

## Why Not Just SEN2SR

SEN2SR is the right near-term standard upscaler, but it does not solve `1 m`
output. Its useful role is:

```text
Sentinel-2 10 m RGBN
  -> cloud/shadow gate
  -> SEN2SR/OpenSR x4
  -> 2.5 m display/context product
```

For `1 m` output, vmesh needs a separate model or a second-stage visual
enhancer:

```text
Sentinel-2 10 m RGBN
  -> cloud/shadow gate
  -> SEN2SR/OpenSR 2.5 m baseline
  -> DR1 visual enhancer
  -> 1 m AI-inferred RGB/RGBN visual layer
```

Resampling a `2.5 m` product to `1 m` is not enough. It only makes a larger
image. DR1 needs training against high-resolution teacher imagery if it is to
look materially better.

## Model Strategy

The no-specialist community path should avoid training a huge model from
scratch.

Recommended first stack:

1. Use SEN2SR/OpenSR to generate the dependable `2.5 m` baseline.
2. Fine-tune a visual super-resolution model from `2.5 m -> ~1 m`.
3. Train on open orthophoto/aerial teacher imagery downsampled or normalized to
   a `1 m` target.
4. Keep model output labelled as AI-inferred visual context.

Candidate model families:

| Model family                    | Use                           | Notes                                                                      |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| SwinIR                          | First serious visual enhancer | Strong image restoration baseline, manageable training.                    |
| Real-ESRGAN / RRDBNet           | Fast community hack           | Visually sharp, but higher hallucination risk.                             |
| SR4RS-style GAN                 | Remote-sensing reference path | Useful training pattern; pretrained S2 model is `2.5 m`, not global truth. |
| DiffFuSR-style diffusion        | Later research path           | Potentially strong, but slower and more complex for v1.                    |
| Custom OpenSR/SEN2SR derivative | Longer-term DR1 model         | Better if vmesh wants a direct `10 m -> 1 m` model later.                  |

GLM, DeepSeek, or other language models should not be the raster upscaler. They
can help orchestrate jobs, write QA reports, inspect failures, create prompts,
and manage metadata, but the image model should be a geospatial/image
super-resolution model.

## Training Data

The full globe of Sentinel tiles is not needed for training. DR1 should train on
sampled paired chips:

```text
low-res input
  -> Sentinel-2 cloud-free RGBN and optional derived bands

high-res teacher
  -> open orthophoto/aerial imagery normalized to 1 m

optional context
  -> DEM, slope, aspect, NDVI, NDWI, landcover, OSM/Overture vectors
```

Strong open-data training sources:

| Region         | Candidate source                         | Use                                                                              |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| United States  | NAIP                                     | Fastest first source; large, RGB+NIR, permissive, cloud-hosted.                  |
| Netherlands    | Beeldmateriaal orthophotos               | Very high quality European orthodata.                                            |
| France         | IGN BD ORTHO / FLAIR-style open datasets | Strong rural and urban European diversity.                                       |
| Spain          | PNOA                                     | Useful high-quality national aerial source.                                      |
| Denmark        | Danish national orthophotos              | Useful northern European training diversity.                                     |
| Japan          | GSI aerial/photo tiles                   | Promising Asian source; verify layer-level provenance.                           |
| Taiwan         | Open UAV/orthophoto datasets             | Useful Asian rural/agricultural texture where licensing permits.                 |
| Hong Kong      | DOP5000 orthophoto                       | Dense urban/subtropical holdout source.                                          |
| Global sampled | OpenAerialMap                            | Patchy but useful for diversity and QA.                                          |
| Global sampled | WorldStrat                               | Useful research reference; check non-commercial restrictions before product use. |
| Global sampled | OpenEarthMap                             | Useful for segmentation/validation, not necessarily SR training alone.           |

NAIP alone is enough for a proof of concept, but it would produce a US-biased
model. A credible community layer should mix regions and hold out entire
countries/biomes for validation.

## Dataset Size

The training unit is a chip, not a whole Sentinel scene. A `512 m x 512 m`
target chip at `1 m/px` covers about `0.26 km2`.

| Level           |       AOI coverage | Approx non-overlap chips | Expected quality                 |
| --------------- | -----------------: | -----------------------: | -------------------------------- |
| Toy demo        |       `50-200 km2` |                `190-760` | Fragile but useful for proof.    |
| Community hack  |    `500-2,000 km2` |            `1,900-7,600` | Usable regional alpha.           |
| Better alpha    | `2,000-10,000 km2` |           `7,600-38,000` | Better multi-region behavior.    |
| Serious product |      `10,000+ km2` |                `38,000+` | Starts to support a public beta. |

Overlap, augmentation, and multi-date Sentinel context can multiply the training
sample count, but they do not replace geographic diversity.

## Storage Estimate For 10,000 km2

Storage depends on whether vmesh keeps raw high-resolution orthos or only
normalized chips.

| Stored asset                                                 | Rough size for `10,000 km2` |
| ------------------------------------------------------------ | --------------------------: |
| `1 m` RGB, uint8, uncompressed equivalent                    |                    `~30 GB` |
| `1 m` RGB+NIR, uint16, uncompressed equivalent               |                    `~80 GB` |
| `20 cm` RGB ortho raw equivalent                             |                   `~750 GB` |
| Sentinel inputs, masks, DEM/context layers                   |                `100-500 GB` |
| Training chips with overlap, metadata, train/val/test splits |                  `0.5-3 TB` |
| Experiments, checkpoints, previews, QA outputs               |                  `0.5-5 TB` |
| Practical working storage                                    |                   `2-10 TB` |

For the hack, prefer keeping raw sources in provider/object storage and writing
normalized chips, manifests, and reproducible source references into the
training bucket.

## Compute Estimate

For first community runs, use a single-node multi-GPU machine before attempting
multi-node distributed training.

| Run type                   |  GPU setup |      Runtime |       GPU-hours | Notes                                          |
| -------------------------- | ---------: | -----------: | --------------: | ---------------------------------------------- |
| Smoke test                 |    `1 GPU` |   `1-2 days` |         `24-48` | Proves data loader, model, and sample outputs. |
| First model pass           |   `2 GPUs` |   `3-5 days` |       `144-240` | Fine-tunes visual enhancer on a small set.     |
| Decent hack                |   `4 GPUs` |  `7-14 days` |     `672-1,344` | Good first public demo candidate.              |
| Better alpha               | `4-8 GPUs` |  `2-4 weeks` |   `1,344-5,376` | Multi-region, more validation.                 |
| Direct `10 m -> 1 m` model | `4-8 GPUs` | `4-8+ weeks` | `2,688-10,752+` | Only after data pipeline works.                |

NVIDIA RTX A6000-class `48 GB` GPUs are enough for many early experiments if
batch sizes are controlled. A single `96 GB` RTX PRO 6000 Blackwell-class GPU,
or a node of multiple `48 GB/80 GB/96 GB` GPUs, is more comfortable. Two
`48 GB` GPUs do not behave like one `96 GB` GPU unless the model is explicitly
parallelized.

## Prime Rental Shape

Prime can be used for both single-node GPU instances and multi-node H100-style
clusters. For DR1 Community, start smaller:

1. `1x` GPU to prove chip generation and training loop.
2. `2-4x` GPUs on one node for the first credible enhancer.
3. `4-8x` GPUs only after validation images look stable.
4. Multi-node clusters only if direct `10 m -> 1 m` training or diffusion-style
   experiments justify the overhead.

Budget with a broad `1.50-5.50 USD/GPU-hour` planning range unless live Prime
availability shows a better price.

| Stage                                       | Expected compute spend |
| ------------------------------------------- | ---------------------: |
| Quick community demo                        |          `$500-$2,000` |
| Credible DR1 hack                           |       `$3,000-$10,000` |
| Usable alpha with failed runs and iteration |      `$10,000-$30,000` |

The bigger risk is bad dataset pairing, not GPU cost. A cheap model trained on
misaligned or cloudy pairs will look plausible and still be wrong.

## Inference And Cache Flow

```text
user requests AOI / H3 cell / property boundary
  -> vmesh checks existing DR1 cache
  -> if missing, creates source plan
  -> Sentinel/cloudless inputs are fetched or reused
  -> SEN2SR/OpenSR baseline is generated when needed
  -> DR1 model produces 1 m AI-inferred visual layer
  -> QA checks cloud, alignment, confidence, and source dates
  -> artifacts are tiled and cached
  -> manifest is published with model/source/provenance metadata
```

Expected artifacts:

```text
dr1-manifest.json
dr1-source-plan.json
sentinel-cloud-report.json
sen2sr-2p5m.cog
dr1-1m-ai-inferred.cog
dr1-preview.png
dr1-tiles.pmtiles
dr1-confidence.cog
dr1-qa-report.json
```

Recommended manifest fields:

```json
{
  "product": "vmesh-dr1-community",
  "truthStatus": "ai-inferred-visual-context",
  "groundTruth": false,
  "sourceSentinelDates": ["2026-04-20"],
  "teacherDatasetFamilies": ["naip", "netherlands-orthophoto"],
  "model": {
    "name": "vmesh-dr1-swinir",
    "version": "0.1.0",
    "baseModel": "swinir",
    "inputResolutionMeters": 2.5,
    "outputResolutionMeters": 1
  },
  "qa": {
    "cloudGate": "pass",
    "alignmentRisk": "medium",
    "hallucinationRisk": "medium",
    "confidence": 0.68
  },
  "limitations": [
    "Not survey-grade",
    "Not legal parcel evidence",
    "Not proof of small objects",
    "May hallucinate detail in out-of-distribution regions"
  ]
}
```

## Cache And Public Sharing

DR1 Community can have public cached tiles only when every source in the package
allows redistribution and generated derivative display.

Public cache is acceptable for:

- open Sentinel-derived products;
- open orthodata-trained model output where training and derived output rights
  are compatible;
- generalized confidence and provenance overlays;
- community opt-in outputs with no private parcel or premium source data.

Private or signed access is required for:

- user-supplied private property imagery;
- paid orthophoto/satellite sources;
- premium parcel/title/survey data;
- provider-restricted outputs;
- any package tied to a private downstream render customer run.

Mapbox, MapTiler, Esri, and similar display-only satellite basemaps must not be
scraped into the training set or used as teacher imagery unless a specific
agreement grants storage, processing, AI training, derivative output, and
redistribution rights.

## Quality Gates

Minimum gates before a DR1 tile is marked usable:

- Sentinel scene or composite has passing cloud/shadow metrics.
- Input and teacher chips are spatially aligned within the accepted tolerance.
- Holdout validation includes at least one non-US geography.
- Model output is compared against bicubic/SEN2SR-only baseline.
- Water bodies, roads, field edges, and large buildings are visually checked.
- Output has a confidence mask or per-tile quality score.
- Manifest includes source dates, model version, training dataset families, and
  limitations.

Failure modes to surface in the UI:

- cloudy source imagery;
- snow or haze;
- hard seasonal mismatch between Sentinel and teacher data;
- region outside training distribution;
- urban detail hallucination;
- false small structures, tracks, fences, or solar panels;
- coastline, water edge, or shadow artifacts.

## Development Plan

### Phase 0: Data Smoke Test

- Select `20-50` AOIs across NAIP coverage.
- Pair Sentinel L2A RGBN with NAIP teacher chips.
- Prove chip generation, alignment, and train/validation split.
- Produce a tiny model and sample previews.

### Phase 1: Community Demo

- Add `100-300` AOIs, mostly NAIP plus at least one non-US source.
- Fine-tune SwinIR or Real-ESRGAN-style enhancer from `2.5 m -> 1 m`.
- Produce COG and PMTiles outputs for selected vmesh cells.
- Add manifest, QA report, and non-ground-truth UI label.

### Phase 2: Multi-Region Alpha

- Add Netherlands, France, Spain, Denmark, and one Asian candidate source after
  license review.
- Create holdout regions by country and biome.
- Improve cloud/shadow filtering and alignment checks.
- Add confidence map and automatic fallback to SEN2SR `2.5 m`.

### Phase 3: DR1 Public Beta

- Publish public cache only for license-safe artifacts.
- Add request queue, status, cache hit/miss, and generation cost tracking.
- Let community users claim, review, and flag tiles.
- Keep generated imagery labelled as AI-inferred visual context everywhere.

## Relationship To Downstream Renderers

DR1 can provide downstream apps and generated-world renderers with a better visual reference than raw Sentinel,
but it should not replace source-backed analysis.

Allowed uses:

- visual context for downstream render prompt preparation;
- vmesh map layer for inspection;
- broad property treatment reference image;
- comparison layer against SEN2SR and premium imagery;
- community exploration and report visuals with clear label.

Blocked uses:

- legal boundary extraction;
- survey, engineering, or planning truth;
- small-object claims such as fences, sheds, roof solar, vehicles, or precise
  roads unless independently source-backed;
- training or output derived from display-only commercial basemap pixels.

## References To Track

- ESAOpenSR/SEN2SR: `https://github.com/ESAOpenSR/SEN2SR`
- SR4RS: `https://github.com/remicres/sr4rs`
- Gamma Earth S2DR3 public article: `https://readmedium.com/sentinel-2-deep-resolution-3-0-c71a601a2253`
- NAIP on AWS: `https://registry.opendata.aws/naip/`
- Prime Intellect docs: `https://docs.primeintellect.ai/`
