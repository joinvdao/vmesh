# Telemetry

V1 defines optional telemetry semantics but does not send live telemetry unless a reviewed endpoint is configured. Mock/local user-added record content must never be emitted.

## Core Event Taxonomy

| Event                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `app_loaded`                | Measures first useful dashboard load.               |
| `renderer_ready`            | Confirms MapLibre and deck.gl initialized.          |
| `hex_hovered`               | Measures exploratory mesh interaction.              |
| `hex_selected`              | Tracks selected-cell inspection workflow.           |
| `layer_toggled`             | Tracks source and local layer use.                  |
| `resolution_changed`        | Tracks H3 resolution changes.                       |
| `user_record_draft_started` | Tracks creation intent without sending record body. |
| `user_record_saved_local`   | Tracks local/mock save success without body text.   |
| `renderer_error`            | Captures category-level renderer failures.          |
| `provider_error`            | Captures category-level data provider failures.     |
| `provider_status`           | Tracks provider category/status only.               |
| `imagery_layer_toggled`     | Tracks imagery layer use without AOI or tile URLs.  |

## Telemetry Fields

- First useful render: time from navigation start to visible dashboard shell plus ready renderer.
- Selection latency: time from click event to updated selected hex panel.
- Renderer error rate: sessions with at least one renderer initialization or layer update error.
- Interaction depth: count of selected H3 cells per session.
- Layer engagement: source/local/imagery layer toggles per session.
- User-added data intent: draft starts by category, without record content.

## Forbidden Properties

Do not send:

- Raw PII.
- Secrets or provider tokens.
- Full user-added record bodies.
- Full private ticket content.
- Exact private addresses.
- Exact sensitive infrastructure coordinates.
- Unreviewed real-world assessment records.
- Selected exact centroid coordinates for live provider calls unless explicitly privacy-reviewed.
- Imagery AOI bounds, tile URLs, scene IDs, or private local cache paths.

## Cost Telemetry

Track provider request counts by category and environment. Add alerting before enabling paid providers for tiles, climate data, property data, market/local asset data, telemetry, or model calls.

## Minimum MVP Dashboards

- Load and renderer readiness.
- Hex interaction depth.
- Source versus local layer engagement.
- User-added draft starts by category.
- Renderer error rate.
- Provider request volume.
- Cost by provider category.
