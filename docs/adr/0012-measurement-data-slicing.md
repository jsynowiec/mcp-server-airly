# ADR 0012: Parameter-based measurement data slicing

## Context

The Airly API returns three data slices in every measurement response: current (last 60min moving average), history (24 hourly averages), and forecast (next 24 hourly averages). Returning all three on every tool call wastes LLM context tokens when only current conditions are needed. Two approaches were considered: six new specialized tools (e.g., `get_current_measurement`) or an `include` parameter on the existing tools.

## Decision

Add an `include` enum parameter (`current | history | forecast | all`, default `current`) to `get_measurement` and `get_installation_measurements`. The server filters the API response before returning it.

- **No multi-select**: Single enum value only. The LLM can call twice (cache makes the second call free) or use `all`.
- **Advisory scoping**: Index advisory text (Airly's human-readable description/advice) is only included when `current` data is returned. History-only and forecast-only responses omit it.
- **API-aligned defaults**: `indexType` defaults to `AIRLY_CAQI`, `indexPollutant` to `PM`, `maxDistanceKM` to `3.0`, `maxResults` to `1` — matching Airly API defaults for minimal payload.

## Consequences

- Tool count stays at 4 instead of growing to 8-10
- Default response (`include: "current"`) is minimal — just current values, index, and standards
- LLM explicitly opts into heavier data slices when needed
- Cache absorbs the cost of multiple calls for different slices of the same location
