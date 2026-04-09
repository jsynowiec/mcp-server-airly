# ADR 0008: Structured text responses, not raw JSON

## Context

Raw JSON wastes LLM context. Natural language summaries make editorial choices. Structured text is the middle ground.

## Decision

Tool responses are formatted as structured text: pollutant values with units, air quality index (value, level, name), WHO standard percentages, and measurement time range. Index advisory text is labeled as a human-readable Airly UI message. History/forecast are compact value-only lines without per-hour index/standard repetition.

This is a starting point — the format can evolve as usage patterns emerge.

## Consequences

- Significantly fewer tokens than raw JSON
- History/forecast are trimmed but present for trend analysis
