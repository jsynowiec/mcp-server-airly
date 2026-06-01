# ADR 0003: LRU read-through cache for all API responses

## Context

The Airly free plan allows 100 API requests per day. Without caching, an LLM could exhaust the limit in minutes.

## Decision

Use `lru-cache` for **Data cache** — max 100 entries, 15-minute TTL. Cache keys are `path + sorted query params` with coordinates rounded to 4 decimal places (~11m precision, sufficient for data interpolated from sensors up to 1.5km away).

Use `Map` for **Meta cache** — max 10 entries, no TTL. For `/v2/meta/*` endpoints that rarely change.

All tools expose `skipCache: boolean` (default `false`) so the LLM can force a fresh reading.

## Consequences

- Same-location queries within 15 minutes cost zero API calls
- Coordinate rounding collapses nearby points into the same cache entry
- Meta resources are free after the first read per session
