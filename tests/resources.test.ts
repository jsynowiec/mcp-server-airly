// ABOUTME: Integration tests for MCP resource registration.
// ABOUTME: Uses InMemoryTransport to verify resources are listed and readable.

import { AirlyClient } from "#/airly.js";
import { registerResources } from "#/resources.js";
import type { IndexType } from "#/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_API_KEY = "test-api-key";

const mockIndexTypes: IndexType[] = [
  {
    name: "AIRLY_CAQI",
    levels: [
      {
        values: "0-25",
        level: "VERY_LOW",
        description: "Very Low",
        color: "#6BC926",
      },
    ],
  },
];

function mockFetchResponse(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  });
}

async function createConnectedPair() {
  const server = new McpServer({ name: "airly-test", version: "0.1.0" });
  const airlyClient = new AirlyClient(TEST_API_KEY);
  registerResources(server, airlyClient);

  const client = new Client({ name: "test-client", version: "0.1.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { server, client, airlyClient };
}

describe("registerResources", () => {
  let originalFetch: typeof globalThis.fetch;
  const connections: { server: McpServer; client: Client }[] = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    for (const { client, server } of connections) {
      await client.close();
      await server.close();
    }
    connections.length = 0;
    globalThis.fetch = originalFetch;
  });

  async function connect() {
    const pair = await createConnectedPair();
    connections.push({ server: pair.server, client: pair.client });
    return pair;
  }

  it("registers three resources with correct URIs", async () => {
    globalThis.fetch = mockFetchResponse([]);
    const { client } = await connect();

    const { resources } = await client.listResources();

    expect(resources).toHaveLength(3);
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain("airly://meta/indexes");
    expect(uris).toContain("airly://meta/measurements");
    expect(uris).toContain("airly://meta/standards");
  });

  it("returns cached data on second read without additional fetch calls", async () => {
    const fetchMock = mockFetchResponse(mockIndexTypes);
    globalThis.fetch = fetchMock;
    const { client } = await connect();

    const first = await client.readResource({ uri: "airly://meta/indexes" });
    const second = await client.readResource({ uri: "airly://meta/indexes" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse((first.contents[0]! as unknown as { text: string }).text),
    ).toEqual(
      JSON.parse((second.contents[0]! as unknown as { text: string }).text),
    );
  });

  it("propagates API errors as MCP errors when a resource read fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          errorCode: "UNAUTHORIZED",
          message: "Invalid API key",
        }),
    });
    const { client } = await connect();

    await expect(
      client.readResource({ uri: "airly://meta/indexes" }),
    ).rejects.toThrow();
  });
});
