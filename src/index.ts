#!/usr/bin/env node
// ABOUTME: CLI entry point for the Airly MCP server.
// ABOUTME: Reads env vars, validates config, connects STDIO transport, and starts serving.

import { createServer } from "#/server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import pkg from "../package.json" with { type: "json" };

async function main() {
  const apiToken = process.env.AIRLY_API_TOKEN;
  if (!apiToken) {
    console.error("Error: AIRLY_API_TOKEN environment variable is required.");
    process.exit(1);
  }

  const defaultLatitude = process.env.AIRLY_DEFAULT_LATITUDE
    ? Number(process.env.AIRLY_DEFAULT_LATITUDE)
    : undefined;
  const defaultLongitude = process.env.AIRLY_DEFAULT_LONGITUDE
    ? Number(process.env.AIRLY_DEFAULT_LONGITUDE)
    : undefined;

  if ((defaultLatitude !== undefined) !== (defaultLongitude !== undefined)) {
    console.error(
      "Error: AIRLY_DEFAULT_LATITUDE and AIRLY_DEFAULT_LONGITUDE must both be set or both omitted.",
    );
    process.exit(1);
  }

  if (
    (defaultLatitude !== undefined && !Number.isFinite(defaultLatitude)) ||
    (defaultLongitude !== undefined && !Number.isFinite(defaultLongitude))
  ) {
    console.error(
      "Error: AIRLY_DEFAULT_LATITUDE and AIRLY_DEFAULT_LONGITUDE must be valid numbers.",
    );
    process.exit(1);
  }

  const SUPPORTED_LANGUAGES = ["en", "pl"];
  const language = process.env.AIRLY_LANGUAGE ?? "en";
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.error(
      `Error: AIRLY_LANGUAGE must be one of: ${SUPPORTED_LANGUAGES.join(", ")}`,
    );
    process.exit(1);
  }

  const server = createServer({
    apiToken,
    defaultLatitude,
    defaultLongitude,
    language,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Airly MCP server v${pkg.version} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
