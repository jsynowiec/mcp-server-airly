# ADR 0006: Stable coordinate schema, defaults applied server-side

## Context

The server supports default coordinates via env vars. Dynamic schemas (making lat/lng optional only when defaults are configured) were considered but rejected — they produce different tool definitions depending on server configuration, which could confuse LLMs.

## Decision

Lat/lng are always optional in the Zod schema. The handler applies defaults as fallback: LLM-provided values take priority, then env var defaults, then `isError`. The schema is identical regardless of server configuration.

Prompts explicitly instruct the LLM that coordinates must be WGS 84 decimal degrees, not place names.

## Consequences

- Stable tool interface across all configurations
- Prompts carry the burden of educating the LLM about coordinate format
