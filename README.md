# Airly MCP Server

[![Sponsor][sponsor-badge]][sponsor]
[![License][license-badge]][license]

An MCP server implementation that integrates the Airly API, enabling natural language interaction with Airly air quality data. This project supports both STDIO and HTTP transports, with STDIO as the default mode.

## 🔑 API Token Requirement

**Important:** An API token is required for authentication. Set it using the `AIRLY_API_TOKEN` environment variable.

## Installing

```json
{
  "mcpServers": {
    "airly-mcp": {
      "command": "npx",
      "args": ["-y", "@jsynowiec/mcp-server-airly"],
      "env": {
        "AIRLY_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## License

Released under the [MIT License][license].

[license-badge]: https://img.shields.io/github/license/jsynowiec/mcp-server-airly.svg
[license]: https://github.com/jsynowiec/mcp-server-airly/blob/master/LICENSE
[sponsor-badge]: https://img.shields.io/badge/♥-Sponsor-fc0fb5.svg
[sponsor]: https://github.com/sponsors/jsynowiec
