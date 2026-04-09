## Architecture

Two-layer design: MCP tool/resource/prompt definitions delegate to a typed Airly API client.

- `src/index.ts` — entry point, `createServer()` for testing, `main()` for STDIO
- `src/tools.ts` — 4 tools: `get_measurement`, `get_nearest_installation`, `get_installation_measurements`, `get_installation`
- `src/resources.ts` — 3 resources: `airly://meta/indexes`, `airly://meta/measurements`, `airly://meta/standards`
- `src/prompts.ts` — 3 prompts: `check_air_quality`, `air_quality_forecast`, `find_nearest_station`
- `src/airly.ts` — `AirlyClient` with LRU read-through cache (15min TTL, max 100 entries)
- `src/types.ts` — TypeScript interfaces for Airly API responses
