#!/usr/bin/env node
// ABOUTME: MCP server entry point for Airly air quality data.
// ABOUTME: Bootstraps the server, registers tools/resources/prompts, connects STDIO transport.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AirlyClient } from './airly.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import type { DefaultCoordinates } from './types.js';

import pkg from '../package.json' with { type: 'json' };

interface ServerConfig {
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

async function main() {
  const apiToken = process.env.AIRLY_API_TOKEN;
  if (!apiToken) {
    console.error('Error: AIRLY_API_TOKEN environment variable is required.');
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
      'Error: AIRLY_DEFAULT_LATITUDE and AIRLY_DEFAULT_LONGITUDE must both be set or both omitted.',
    );
    process.exit(1);
  }

  if (
    (defaultLatitude !== undefined && !Number.isFinite(defaultLatitude)) ||
    (defaultLongitude !== undefined && !Number.isFinite(defaultLongitude))
  ) {
    console.error('Error: AIRLY_DEFAULT_LATITUDE and AIRLY_DEFAULT_LONGITUDE must be valid numbers.');
    process.exit(1);
  }

  const SUPPORTED_LANGUAGES = ['en', 'pl'];
  const language = process.env.AIRLY_LANGUAGE ?? 'en';
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.error(`Error: AIRLY_LANGUAGE must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
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

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
