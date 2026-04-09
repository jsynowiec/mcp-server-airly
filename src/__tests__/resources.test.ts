// ABOUTME: Integration tests for MCP resource registration.
// ABOUTME: Uses InMemoryTransport to verify resources are listed and readable.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AirlyClient } from '../airly.js';
import { registerResources } from '../resources.js';
import type { IndexType, MeasurementType, StandardType } from '../types.js';

const TEST_API_KEY = 'test-api-key';

const mockIndexTypes: IndexType[] = [
  {
    name: 'AIRLY_CAQI',
    levels: [{ values: '0-25', level: 'VERY_LOW', description: 'Very Low', color: '#6BC926' }],
  },
];

const mockMeasurementTypes: MeasurementType[] = [
  { name: 'PM10', label: 'PM10', unit: 'µg/m³' },
];

const mockStandardTypes: StandardType[] = [
  { name: 'WHO', standardLimits: { PM10: 45.0, PM25: 15.0 } },
];

function mockFetchResponse(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  });
}

async function createConnectedPair() {
  const server = new McpServer({ name: 'airly-test', version: '0.1.0' });
  const airlyClient = new AirlyClient(TEST_API_KEY);
  registerResources(server, airlyClient);

  const client = new Client({ name: 'test-client', version: '0.1.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { server, client, airlyClient };
}

describe('registerResources', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('registers three resources with correct URIs', async () => {
    globalThis.fetch = mockFetchResponse([]);
    const { client } = await createConnectedPair();

    const { resources } = await client.listResources();

    expect(resources).toHaveLength(3);
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('airly://meta/indexes');
    expect(uris).toContain('airly://meta/measurements');
    expect(uris).toContain('airly://meta/standards');
  });

  it('reads airly://meta/indexes and returns index type data as JSON', async () => {
    globalThis.fetch = mockFetchResponse(mockIndexTypes);
    const { client } = await createConnectedPair();

    const { contents } = await client.readResource({ uri: 'airly://meta/indexes' });

    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe('airly://meta/indexes');
    expect(contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(contents[0].text as string)).toEqual(mockIndexTypes);
  });

  it('reads airly://meta/measurements and returns measurement type data as JSON', async () => {
    globalThis.fetch = mockFetchResponse(mockMeasurementTypes);
    const { client } = await createConnectedPair();

    const { contents } = await client.readResource({ uri: 'airly://meta/measurements' });

    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe('airly://meta/measurements');
    expect(contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(contents[0].text as string)).toEqual(mockMeasurementTypes);
  });

  it('reads airly://meta/standards and returns standard type data as JSON', async () => {
    globalThis.fetch = mockFetchResponse(mockStandardTypes);
    const { client } = await createConnectedPair();

    const { contents } = await client.readResource({ uri: 'airly://meta/standards' });

    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe('airly://meta/standards');
    expect(contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(contents[0].text as string)).toEqual(mockStandardTypes);
  });

  it('returns cached data on second read without additional fetch calls', async () => {
    const fetchMock = mockFetchResponse(mockIndexTypes);
    globalThis.fetch = fetchMock;
    const { client } = await createConnectedPair();

    const first = await client.readResource({ uri: 'airly://meta/indexes' });
    const second = await client.readResource({ uri: 'airly://meta/indexes' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(first.contents[0].text as string)).toEqual(
      JSON.parse(second.contents[0].text as string),
    );
  });
});
