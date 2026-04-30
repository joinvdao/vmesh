# Analytics

V1 defines analytics semantics but does not send live telemetry unless a reviewed endpoint is configured. Mock/local user-added record content must never be emitted.

## Core Event Taxonomy

| Event                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `app_loaded`                | Measures first useful dashboard load.               |
| `renderer_ready`            | Confirms MapLibre and deck.gl initialized.          |
| `hex_hovered`               | Measures exploratory mesh interaction.              |
| `hex_selected`              | Measures selected-cell analysis workflow.           |
| `layer_toggled`             | Tracks macro and micro layer use.                   |
| `resolution_changed`        | Tracks H3 resolution changes.                       |
| `user_record_draft_started` | Tracks creation intent without sending record body. |
| `user_record_saved_local`   | Tracks local/mock save success without body text.   |
| `renderer_error`            | Captures category-level renderer failures.          |
| `provider_error`            | Captures category-level data provider failures.     |

## Metric Definitions

- First useful render: time from navigation start to visible dashboard shell plus ready renderer.
- Selection latency: time from click event to updated selected hex panel.
- Renderer error rate: sessions with at least one renderer initialization or layer update error.
- Interaction depth: count of selected H3 cells per session.
- Layer engagement: macro/micro layer toggles per session.
- User-added data intent: draft starts by category, without record content.

## Forbidden Properties

Do not send:

- Raw PII.
- Secrets or provider tokens.
- Full user-added record bodies.
- Full private ticket content.
- Exact private addresses.
- Exact sensitive infrastructure coordinates.
- Unreviewed real-world risk records.

## Cost Telemetry

Track provider request counts by category and environment. Add alerting before enabling paid providers for tiles, climate data, property data, market/local asset data, analytics, or model calls.

## Minimum MVP Dashboards

- Load and renderer readiness.
- Hex interaction depth.
- Macro versus micro layer engagement.
- User-added draft starts by category.
- Renderer error rate.
- Provider request volume.
- Cost by provider category.
