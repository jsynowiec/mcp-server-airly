// ABOUTME: Factory function that creates a configured MCP server instance.
// ABOUTME: Wires up AirlyClient, tools, resources, and prompts without connecting a transport.

import { AirlyClient } from "#/airly.js";
import { registerPrompts } from "#/prompts.js";
import { registerResources } from "#/resources.js";
import { registerTools } from "#/tools.js";
import type { Location } from "#/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import pkg from "../package.json" with { type: "json" };

export interface ServerConfig {
  apiToken: string;
  language: string;
  defaultLatitude?: number;
  defaultLongitude?: number;
}

export function createServer(config: ServerConfig): McpServer {
  const client = new AirlyClient(config.apiToken, {
    language: config.language,
  });

  let defaultCoords: Location | undefined;
  if (
    config.defaultLatitude !== undefined &&
    config.defaultLongitude !== undefined
  ) {
    defaultCoords = {
      latitude: config.defaultLatitude,
      longitude: config.defaultLongitude,
    };
  }

  const server = new McpServer({
    name: pkg.name,
    version: pkg.version,
  });

  registerTools(server, client, defaultCoords);
  registerResources(server, client);
  registerPrompts(server);

  return server;
}
