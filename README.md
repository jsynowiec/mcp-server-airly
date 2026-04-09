# Airly MCP Server

[![Sponsor][sponsor-badge]][sponsor]
[![License][license-badge]][license]

An MCP server that integrates the [Airly API](https://github.com/airly-eu/api-docs), enabling natural language interaction with air quality data. Query real-time measurements, find nearby stations, and get air quality forecasts through any MCP-compatible client.

## API Token

An [Airly API](https://developer.airly.org/) token is required. Set it using the `AIRLY_API_TOKEN` environment variable.

## Installing

### npx (Node.js)

```json
{
  "mcpServers": {
    "airly": {
      "command": "npx",
      "args": ["-y", "@jsynowiec/mcp-server-airly"],
      "env": {
        "AIRLY_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### bunx (Bun)

```json
{
  "mcpServers": {
    "airly": {
      "command": "bunx",
      "args": ["--bun", "@jsynowiec/mcp-server-airly"],
      "env": {
        "AIRLY_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Local development

Build the project first, then point your MCP client at the local build output:

```json
{
  "mcpServers": {
    "airly": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-airly/dist/index.js"],
      "env": {
        "AIRLY_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `AIRLY_API_TOKEN` | Yes | | Airly API key |
| `AIRLY_DEFAULT_LATITUDE` | No | | Default latitude (decimal degrees) |
| `AIRLY_DEFAULT_LONGITUDE` | No | | Default longitude (decimal degrees) |
| `AIRLY_LANGUAGE` | No | `en` | Response language (`en` or `pl`) |

Default coordinates must be set together. When configured, location-based tools use them as a fallback when the LLM doesn't provide coordinates.

## Tools

### get_measurement

Get interpolated air quality measurements for any location. Returns current pollutant concentrations, air quality index with health advice, and WHO standard compliance. Includes 24-hour history and forecast.

### get_nearest_installation

Find the nearest air quality monitoring stations to a given location, sorted by proximity. Returns station metadata including address, coordinates, and sensor type.

### get_installation_measurements

Get measurements from a specific station by its installation ID. Same response format as `get_measurement`.

### get_installation

Get metadata for a specific monitoring station.

## Resources

| URI | Description |
|---|---|
| `airly://meta/indexes` | Air quality index types and level definitions |
| `airly://meta/measurements` | Measurement types with labels and units |
| `airly://meta/standards` | Air quality standards and pollutant limits |

Resources are cached for the session lifetime.

## Prompts

| Prompt | Description |
|---|---|
| `check_air_quality` | Check current air quality at a location |
| `air_quality_forecast` | Get the 24-hour air quality forecast |
| `find_nearest_station` | Find nearby monitoring stations |

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0 or Node.js >= 22
- An [Airly API token](https://developer.airly.org/)

### Setup

```bash
bun install
bun run build
```

### Scripts

```bash
bun run build       # Compile TypeScript
bun run lint        # Run ESLint
bun run typecheck   # Type-check without emitting
bun run test        # Run tests
bun run dev:test    # Run tests in watch mode
```

### Testing with MCP Inspector

```bash
AIRLY_API_TOKEN=your-token npx @modelcontextprotocol/inspector node dist/index.js
```

### Release

The `prepublishOnly` script automatically runs build, lint, type-check, and tests before `npm publish`:

```bash
npm publish --access public
```

## Disclaimer

This project is not affiliated with, endorsed by, or associated with [Airly](https://airly.org/) in any way. It is an independent, open-source integration built on the publicly available [Airly API](https://developer.airly.org/).

## License

Released under the [MIT License][license].

[license-badge]: https://img.shields.io/github/license/jsynowiec/mcp-server-airly.svg
[license]: https://github.com/jsynowiec/mcp-server-airly/blob/master/LICENSE
[sponsor-badge]: https://img.shields.io/badge/♥-Sponsor-fc0fb5.svg
[sponsor]: https://github.com/sponsors/jsynowiec
