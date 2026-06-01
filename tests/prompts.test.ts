// ABOUTME: Tests for MCP prompt registrations (air quality, forecast, nearest station).
// ABOUTME: Uses InMemoryTransport with a real MCP Client to verify prompt metadata and messages.

import { registerPrompts } from "#/prompts.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

async function createTestClient() {
  const server = new McpServer({
    name: "airly-test",
    version: "0.0.1",
  });

  registerPrompts(server);

  const client = new Client({ name: "test-client", version: "0.0.1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

describe("registerPrompts", () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    ({ client, server } = await createTestClient());
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe("prompts/list", () => {
    it("returns exactly 3 prompts", async () => {
      const { prompts } = await client.listPrompts();

      expect(prompts).toHaveLength(3);
    });

    it("registers check_air_quality with latitude and longitude arguments", async () => {
      const { prompts } = await client.listPrompts();
      const prompt = prompts.find((p) => p.name === "check_air_quality");

      expect(prompt).toBeDefined();
      expect(prompt!.description).toBe(
        "Check current air quality at a location",
      );
      expect(prompt!.arguments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "latitude", required: true }),
          expect.objectContaining({ name: "longitude", required: true }),
        ]),
      );
    });

    it("registers air_quality_forecast with latitude and longitude arguments", async () => {
      const { prompts } = await client.listPrompts();
      const prompt = prompts.find((p) => p.name === "air_quality_forecast");

      expect(prompt).toBeDefined();
      expect(prompt!.description).toBe(
        "Get the air quality forecast for the next 24 hours",
      );
      expect(prompt!.arguments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "latitude", required: true }),
          expect.objectContaining({ name: "longitude", required: true }),
        ]),
      );
    });

    it("registers find_nearest_station with latitude, longitude, and optional maxDistanceKM", async () => {
      const { prompts } = await client.listPrompts();
      const prompt = prompts.find((p) => p.name === "find_nearest_station");

      expect(prompt).toBeDefined();
      expect(prompt!.description).toBe(
        "Find the nearest air quality monitoring station",
      );
      expect(prompt!.arguments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "latitude", required: true }),
          expect.objectContaining({ name: "longitude", required: true }),
          expect.objectContaining({ name: "maxDistanceKM", required: false }),
        ]),
      );
    });
  });

  describe("check_air_quality", () => {
    it("returns a message with coordinate and tool guidance", async () => {
      const result = await client.getPrompt({
        name: "check_air_quality",
        arguments: { latitude: "50.062", longitude: "19.941" },
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0]!.content as {
        type: string;
        text: string;
      };
      expect(text.type).toBe("text");
      expect(text.text).toContain("get_measurement");
      expect(text.text).toContain("50.062");
      expect(text.text).toContain("19.941");
      expect(text.text).toContain("WGS 84");
      expect(text.text).toContain("health");
      expect(text.text).toContain("WHO");
    });
  });

  describe("air_quality_forecast", () => {
    it("returns a message with forecast guidance", async () => {
      const result = await client.getPrompt({
        name: "air_quality_forecast",
        arguments: { latitude: "50.062", longitude: "19.941" },
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0]!.content as {
        type: string;
        text: string;
      };
      expect(text.type).toBe("text");
      expect(text.text).toContain("get_measurement");
      expect(text.text).toContain("50.062");
      expect(text.text).toContain("19.941");
      expect(text.text).toContain("forecast");
      expect(text.text).toContain("24 hours");
      expect(text.text).toContain("WGS 84");
    });
  });

  describe("find_nearest_station", () => {
    it("returns a message with station finding guidance", async () => {
      const result = await client.getPrompt({
        name: "find_nearest_station",
        arguments: { latitude: "50.062", longitude: "19.941" },
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0]!.content as {
        type: string;
        text: string;
      };
      expect(text.type).toBe("text");
      expect(text.text).toContain("get_nearest_installation");
      expect(text.text).toContain("50.062");
      expect(text.text).toContain("19.941");
      expect(text.text).toContain("WGS 84");
      expect(text.text).toContain("distance");
      expect(text.text).toContain("address");
    });

    it("includes distance clause when maxDistanceKM is provided", async () => {
      const result = await client.getPrompt({
        name: "find_nearest_station",
        arguments: {
          latitude: "50.062",
          longitude: "19.941",
          maxDistanceKM: "5",
        },
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0]!.content as {
        type: string;
        text: string;
      };
      expect(text.text).toContain("maximum search distance of 5 km");
    });
  });
});
