#!/usr/bin/env node
// ABOUTME: CLI entry point for the Airly MCP server.
// ABOUTME: Reads env vars, validates config, connects STDIO transport, and starts serving.

import { env } from "#/env.js";
import { createServer } from "#/server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import pkg from "../package.json" with { type: "json" };

async function main() {
  const server = createServer({
    apiToken: env.AIRLY_API_TOKEN,
    defaultLatitude: env.AIRLY_DEFAULT_LATITUDE,
    defaultLongitude: env.AIRLY_DEFAULT_LONGITUDE,
    language: env.AIRLY_LANGUAGE,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Airly MCP server v${pkg.version} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
