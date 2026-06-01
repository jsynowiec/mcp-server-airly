// ABOUTME: Registers MCP resources exposing Airly metadata (indexes, measurements, standards).
// ABOUTME: Each resource delegates to AirlyClient, which handles caching internally.

import type { AirlyClient } from "#/airly.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(
  server: McpServer,
  client: AirlyClient,
): void {
  server.registerResource(
    "indexes",
    "airly://meta/indexes",
    { mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await client.getIndexes(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "measurements",
    "airly://meta/measurements",
    { mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await client.getMeasurementTypes(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "standards",
    "airly://meta/standards",
    { mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await client.getStandards(), null, 2),
        },
      ],
    }),
  );
}
