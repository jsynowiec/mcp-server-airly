# Architecture Decision Records

| ADR | Decision |
|---|---|
| [0001](0001-sdk-version.md) | Use MCP SDK v1 stable, migrate to v2 when stable |
| [0002](0002-two-layer-architecture.md) | Two-layer architecture: MCP registrations + API client |
| [0003](0003-lru-read-through-cache.md) | LRU read-through cache with 15min TTL, 100 max entries |
| [0004](0004-tool-surface-design.md) | Four separate snake_case tools, seven Airly endpoints omitted |
| [0005](0005-meta-as-resources.md) | Meta endpoints exposed as MCP Resources, not tools |
| [0006](0006-coordinate-handling.md) | Coordinates always required in schema, defaults server-side |
| [0007](0007-error-handling-strategy.md) | All expected errors returned as tool results, never thrown |
| [0008](0008-response-formatting.md) | Structured text responses, not raw JSON passthrough |
| [0009](0009-testing-strategy.md) | Mocked fetch and InMemoryTransport, no real API calls |
| [0010](0010-runtime-and-tooling.md) | Bun primary, npx compatible, Node >= 22 |
| [0012](0012-measurement-data-slicing.md) | Parameter-based data slicing with API-aligned defaults |
