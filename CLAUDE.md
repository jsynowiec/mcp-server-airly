@README.md
@.claude/CLAUDE.local.md
@docs/architecture.md

## Conventions

- SDK: `@modelcontextprotocol/sdk` v1 (deep imports: `@modelcontextprotocol/sdk/server/mcp.js`)
- Schema validation: Zod v3, `.describe()` on every field
- Tool names: snake_case
- All logging to stderr (never stdout — that's the STDIO transport)
- ESM only, `.js` extensions in imports

## Testing

- Mock `globalThis.fetch` in API client tests, `InMemoryTransport.createLinkedPair()` for tool/resource/prompt tests
- No real API calls in tests (Airly free plan: 100 req/day)
- `createServer()` in `src/index.ts` exists for test use — it wires everything without connecting a transport
