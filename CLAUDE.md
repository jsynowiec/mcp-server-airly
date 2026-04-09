@README.md
@.claude/CLAUDE.local.md

## Architecture

Two-layer design: MCP tool/resource/prompt definitions delegate to a typed Airly API client.

- `src/index.ts` — entry point, `createServer()` for testing, `main()` for STDIO
- `src/tools.ts` — 4 tools: `get_measurement`, `get_nearest_installation`, `get_installation_measurements`, `get_installation`
- `src/resources.ts` — 3 resources: `airly://meta/indexes`, `airly://meta/measurements`, `airly://meta/standards`
- `src/prompts.ts` — 3 prompts: `check_air_quality`, `air_quality_forecast`, `find_nearest_station`
- `src/airly.ts` — `AirlyClient` with LRU read-through cache (15min TTL, max 100 entries)
- `src/types.ts` — TypeScript interfaces for Airly API responses

## Commands

```bash
bun run build       # TypeScript compile to dist/
bun run lint        # ESLint
bun run typecheck   # tsc --noEmit
bun run test        # vitest run (all tests, mocked fetch)
bun run dev:test    # vitest watch mode
```

## Conventions

- SDK: `@modelcontextprotocol/sdk` v1 (deep imports: `@modelcontextprotocol/sdk/server/mcp.js`)
- Schema validation: Zod v3, `.describe()` on every field
- Tool names: snake_case (e.g., `get_measurement`)
- All logging to stderr (never stdout — that's the STDIO transport)
- ESM only, `.js` extensions in imports

## Testing

- API client tests: mock `globalThis.fetch`, verify URL construction, headers, error mapping, caching
- Tool/resource/prompt tests: `InMemoryTransport.createLinkedPair()` from `@modelcontextprotocol/sdk/inMemory.js`
- No real API calls in tests (100 req/day limit)
- Manual testing: `AIRLY_API_TOKEN=<token> npx @modelcontextprotocol/inspector node dist/index.js`

## Environment Variables

- `AIRLY_API_TOKEN` (required) — Airly API key
- `AIRLY_DEFAULT_LATITUDE` / `AIRLY_DEFAULT_LONGITUDE` (optional pair) — fallback coordinates
- `AIRLY_LANGUAGE` (optional, default: `en`) — response language (`en` or `pl`)
