# ADR 0004: Four separate tools, seven endpoints omitted

## Context

The Airly API has 12 endpoints. We needed to decide which to expose and whether to use separate tools, a unified tool with a method parameter, or something in between.

## Decision

Four tools, each mapping to one endpoint:

- `get_measurement` — interpolated point measurement (primary tool)
- `get_nearest_installation` — find nearby stations
- `get_installation_measurements` — measurement by station ID
- `get_installation` — station metadata

Tool names use snake_case (de facto MCP ecosystem convention).

Omitted endpoints: `installations/location` and `installations/sensor` (require internal Airly IDs), `measurements/location` (same), `measurements/nearest` (redundant with point interpolation). Three `/meta/*` endpoints are exposed as MCP Resources instead (see ADR 0005).

## Consequences

- LLMs see 4 clearly named tools with no method-parameter complexity
- `get_measurement` is the default for most queries
