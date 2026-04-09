// ABOUTME: Integration tests for the MCP server wiring.
// ABOUTME: Verifies all tools, resources, and prompts are registered correctly.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';

function mockFetchResponse(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  });
}

describe('MCP server wiring', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetchResponse({});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function connectServer(options?: {
    defaultLatitude?: number;
    defaultLongitude?: number;
    language?: string;
  }) {
    const server = createServer({
      apiToken: 'test-token',
      defaultLatitude: options?.defaultLatitude,
      defaultLongitude: options?.defaultLongitude,
      language: options?.language ?? 'en',
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);

    return { server, client };
  }

  it('exposes correct server name and version', async () => {
    const { client } = await connectServer();
    const info = client.getServerVersion();
    expect(info?.name).toBe('airly');
  });

  it('registers all 4 tools', async () => {
    const { client } = await connectServer();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'get_installation',
      'get_installation_measurements',
      'get_measurement',
      'get_nearest_installation',
    ]);
  });

  it('registers all 3 resources', async () => {
    const { client } = await connectServer();
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual([
      'airly://meta/indexes',
      'airly://meta/measurements',
      'airly://meta/standards',
    ]);
  });

  it('registers all 3 prompts', async () => {
    const { client } = await connectServer();
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual([
      'air_quality_forecast',
      'check_air_quality',
      'find_nearest_station',
    ]);
  });

  it('works with default coordinates', async () => {
    const { client } = await connectServer({
      defaultLatitude: 50.062,
      defaultLongitude: 19.941,
    });
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(4);
  });

  it('accepts custom language setting', async () => {
    const { client } = await connectServer({ language: 'pl' });
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(4);
  });
});
