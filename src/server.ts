// ABOUTME: Factory function that creates a configured MCP server instance.
// ABOUTME: Wires up AirlyClient, tools, resources, and prompts without connecting a transport.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AirlyClient } from './airly.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import type { DefaultCoordinates } from './types.js';

import pkg from '../package.json' with { type: 'json' };

export interface ServerConfig {
  apiToken: string;
  defaultLatitude?: number;
  defaultLongitude?: number;
  language?: string;
}

export function createServer(config: ServerConfig): McpServer {
  const client = new AirlyClient(config.apiToken, { language: config.language ?? 'en' });

  let defaultCoords: DefaultCoordinates | undefined;
  if (config.defaultLatitude !== undefined && config.defaultLongitude !== undefined) {
    defaultCoords = {
      latitude: config.defaultLatitude,
      longitude: config.defaultLongitude,
    };
  }

  const server = new McpServer({
    name: 'airly',
    version: pkg.version,
  });

  registerTools(server, client, defaultCoords);
  registerResources(server, client);
  registerPrompts(server);

  return server;
}
