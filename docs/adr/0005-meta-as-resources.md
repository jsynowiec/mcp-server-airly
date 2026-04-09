# ADR 0005: Expose Airly meta endpoints as MCP Resources

## Context

The Airly `/v2/meta/*` endpoints return static reference data (index levels, measurement types, standards). Options: don't expose, expose as tools, or expose as MCP Resources.

## Decision

Expose as MCP Resources with `airly://` URI scheme. Resources are application-controlled (client fetches for context), cached with no TTL. Maximum 3 API calls per session for all meta data.

## Consequences

- MCP clients get reference data without burning tool calls
- Richer context for the LLM about index levels and measurement units
