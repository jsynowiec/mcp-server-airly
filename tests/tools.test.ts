// ABOUTME: Integration tests for MCP tool registration and execution.
// ABOUTME: Uses InMemoryTransport to test tools through the MCP protocol.

import { AirlyApiError, AirlyClient } from "#/airly.js";
import { registerTools } from "#/tools.js";
import type { Installation, Measurement } from "#/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockInstallation: Installation = {
  id: 204,
  location: { latitude: 50.062006, longitude: 19.940984 },
  locationId: 204,
  address: {
    country: "Poland",
    city: "Kraków",
    street: "Mikołajska",
    number: "4B",
    displayAddress1: "Kraków",
    displayAddress2: "Mikołajska",
  },
  elevation: 220.38,
  airly: true,
  sponsor: {
    id: 7,
    name: "KrakówOddycha",
    description: "Airly Sensor is part of action",
    logo: "https://cdn.airly.org/logo/KrakówOddycha.jpg",
    link: "https://sponsor_home_address.pl",
    displayName: "KrakówOddycha",
  },
};

const mockMeasurement: Measurement = {
  current: {
    fromDateTime: "2024-08-24T08:24:48.652Z",
    tillDateTime: "2024-08-24T09:24:48.652Z",
    values: [
      { name: "PM25", value: 18.7 },
      { name: "PM10", value: 35.53 },
    ],
    indexes: [
      {
        name: "AIRLY_CAQI",
        value: 35.53,
        level: "LOW",
        description: "Good air.",
        advice: "You can go outside without worries.",
        color: "#D1CF1E",
      },
    ],
    standards: [{ name: "WHO", pollutant: "PM25", limit: 25, percent: 74.81 }],
  },
  history: [
    {
      fromDateTime: "2024-08-24T07:00:00.000Z",
      tillDateTime: "2024-08-24T08:00:00.000Z",
      values: [
        { name: "PM25", value: 15.2 },
        { name: "PM10", value: 30.1 },
      ],
      indexes: [],
      standards: [],
    },
  ],
  forecast: [
    {
      fromDateTime: "2024-08-24T10:00:00.000Z",
      tillDateTime: "2024-08-24T11:00:00.000Z",
      values: [
        { name: "PM25", value: 20.0 },
        { name: "PM10", value: 38.0 },
      ],
      indexes: [],
      standards: [],
    },
  ],
};

function createMockAirlyClient(): AirlyClient {
  const client = Object.create(AirlyClient.prototype) as AirlyClient;

  (client as unknown as Record<string, unknown>).getMeasurementPoint = vi
    .fn()
    .mockResolvedValue(mockMeasurement);
  (client as unknown as Record<string, unknown>).getNearestInstallations = vi
    .fn()
    .mockResolvedValue([mockInstallation]);
  (client as unknown as Record<string, unknown>).getMeasurementInstallation = vi
    .fn()
    .mockResolvedValue(mockMeasurement);
  (client as unknown as Record<string, unknown>).getInstallation = vi
    .fn()
    .mockResolvedValue(mockInstallation);

  return client;
}

const connections: { mcpClient: Client; server: McpServer }[] = [];

async function setupTestHarness(options?: {
  defaultCoords?: { latitude: number; longitude: number };
  airlyClient?: AirlyClient;
}) {
  const airlyClient = options?.airlyClient ?? createMockAirlyClient();
  const server = new McpServer({ name: "airly-test", version: "0.0.1" });
  registerTools(server, airlyClient, options?.defaultCoords);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({ name: "test-client", version: "0.0.1" });

  await server.connect(serverTransport);
  await mcpClient.connect(clientTransport);

  connections.push({ mcpClient, server });
  return { server, mcpClient, airlyClient };
}

describe("registerTools", () => {
  afterEach(async () => {
    for (const { mcpClient, server } of connections) {
      await mcpClient.close();
      await server.close();
    }
    connections.length = 0;
  });

  describe("tool listing", () => {
    it("registers exactly 4 tools", async () => {
      const { mcpClient } = await setupTestHarness();
      const result = await mcpClient.listTools();
      expect(result.tools).toHaveLength(4);
    });

    it("registers tools with expected names", async () => {
      const { mcpClient } = await setupTestHarness();
      const result = await mcpClient.listTools();
      const names = result.tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "get_installation",
        "get_installation_measurements",
        "get_measurement",
        "get_nearest_installation",
      ]);
    });
  });

  describe("get_measurement", () => {
    it("returns formatted measurement text with lat/lng", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("PM25");
      expect(text).toContain("18.7");
      expect(text).toContain("AIRLY_CAQI");
      expect(text).toContain("LOW");
      expect(text).toContain("Good air.");
      expect(text).toContain("74.81%");
    });

    it("falls back to default coordinates when lat/lng omitted", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({
        defaultCoords: { latitude: 50.062, longitude: 19.941 },
        airlyClient,
      });

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: {},
      });

      expect(result.isError).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getMeasurementPoint).toHaveBeenCalledWith(
        50.062,
        19.941,
        expect.any(Object),
      );
    });

    it("returns isError when no coordinates and no defaults", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toMatch(/latitude|longitude|coordinates/i);
    });

    it("passes skipCache through to the client", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({ airlyClient });

      await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941, skipCache: true },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getMeasurementPoint).toHaveBeenCalledWith(
        50.062,
        19.941,
        expect.objectContaining({ skipCache: true }),
      );
    });

    it("defaults to current slice only (no history/forecast)", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("PM25");
      expect(text).toContain("AIRLY_CAQI");
      expect(text).not.toContain("History");
      expect(text).not.toContain("Forecast");
    });

    it('returns only history when include is "history"', async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941, include: "history" },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("History");
      expect(text).toContain("15.2");
      expect(text).not.toContain("Forecast");
      expect(text).not.toContain("Current values");
      expect(text).not.toContain("Advisory");
    });

    it('returns only forecast when include is "forecast"', async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941, include: "forecast" },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("Forecast");
      expect(text).toContain("PM25: 20");
      expect(text).not.toContain("History");
      expect(text).not.toContain("Current values");
      expect(text).not.toContain("Advisory");
    });

    it('returns all slices when include is "all"', async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941, include: "all" },
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("Current values");
      expect(text).toContain("History");
      expect(text).toContain("Forecast");
      expect(text).toContain("Advisory");
    });
  });

  describe("get_nearest_installation", () => {
    it("returns formatted installation list", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_nearest_installation",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("204");
      expect(text).toContain("Kraków");
      expect(text).toContain("Mikołajska");
    });

    it("falls back to default coordinates when lat/lng omitted", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({
        defaultCoords: { latitude: 50.062, longitude: 19.941 },
        airlyClient,
      });

      await mcpClient.callTool({
        name: "get_nearest_installation",
        arguments: {},
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getNearestInstallations).toHaveBeenCalledWith(
        50.062,
        19.941,
        expect.any(Object),
      );
    });

    it("returns isError when no coordinates and no defaults", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_nearest_installation",
        arguments: {},
      });

      expect(result.isError).toBe(true);
    });

    it("passes skipCache through to the client", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({ airlyClient });

      await mcpClient.callTool({
        name: "get_nearest_installation",
        arguments: { latitude: 50.062, longitude: 19.941, skipCache: true },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getNearestInstallations).toHaveBeenCalledWith(
        50.062,
        19.941,
        expect.objectContaining({ skipCache: true }),
      );
    });
  });

  describe("get_installation_measurements", () => {
    it("returns formatted measurement text", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_installation_measurements",
        arguments: { installationId: 204 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("PM25");
      expect(text).toContain("18.7");
      expect(text).toContain("AIRLY_CAQI");
    });

    it("passes skipCache through to the client", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({ airlyClient });

      await mcpClient.callTool({
        name: "get_installation_measurements",
        arguments: { installationId: 204, skipCache: true },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getMeasurementInstallation).toHaveBeenCalledWith(
        204,
        expect.objectContaining({ skipCache: true }),
      );
    });
  });

  describe("get_installation", () => {
    it("returns installation metadata", async () => {
      const { mcpClient } = await setupTestHarness();

      const result = await mcpClient.callTool({
        name: "get_installation",
        arguments: { installationId: 204 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("204");
      expect(text).toContain("Kraków");
      expect(text).toContain("Mikołajska");
      expect(text).toContain("220.38");
      expect(text).toMatch(/airly/i);
    });

    it("passes skipCache through to the client", async () => {
      const airlyClient = createMockAirlyClient();
      const { mcpClient } = await setupTestHarness({ airlyClient });

      await mcpClient.callTool({
        name: "get_installation",
        arguments: { installationId: 204, skipCache: true },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(airlyClient.getInstallation).toHaveBeenCalledWith(
        204,
        expect.objectContaining({ skipCache: true }),
      );
    });
  });

  describe("get_installation with null address fields", () => {
    it("formats address correctly when city and street are null", async () => {
      const installationWithNulls: Installation = {
        ...mockInstallation,
        address: {
          country: "Poland",
          city: null,
          street: null,
          number: "4B",
          displayAddress1: null,
          displayAddress2: null,
        },
      };
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getInstallation = vi
        .fn()
        .mockResolvedValue(installationWithNulls);
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_installation",
        arguments: { installationId: 204 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("Address: 4B");
      expect(text).not.toContain("Kraków");
      expect(text).not.toContain("Mikołajska");
      expect(text).not.toContain("null");
    });
  });

  describe("get_measurement with empty arrays", () => {
    it("handles empty values, indexes, and standards gracefully", async () => {
      const emptyMeasurement: Measurement = {
        current: {
          fromDateTime: "2024-08-24T08:00:00.000Z",
          tillDateTime: "2024-08-24T09:00:00.000Z",
          values: [],
          indexes: [],
          standards: [],
        },
        history: [],
        forecast: [],
      };
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getMeasurementPoint =
        vi.fn().mockResolvedValue(emptyMeasurement);
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("Measurement period");
      expect(text).not.toContain("Current values");
      expect(text).not.toContain("Air Quality Index");
      expect(text).not.toContain("WHO standards");
    });
  });

  describe("get_nearest_installation with empty list", () => {
    it('returns "No installations found nearby." for empty results', async () => {
      const airlyClient = createMockAirlyClient();
      (
        airlyClient as unknown as Record<string, unknown>
      ).getNearestInstallations = vi.fn().mockResolvedValue([]);
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_nearest_installation",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("No installations found nearby.");
    });
  });

  describe("get_measurement with empty history slice", () => {
    it('returns "No history data available." when history is empty', async () => {
      const noHistoryMeasurement: Measurement = {
        ...mockMeasurement,
        history: [],
      };
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getMeasurementPoint =
        vi.fn().mockResolvedValue(noHistoryMeasurement);
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941, include: "history" },
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toBe("No history data available.");
    });
  });

  describe("error handling", () => {
    it("returns isError on 404", async () => {
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getInstallation = vi
        .fn()
        .mockRejectedValue(
          new AirlyApiError(404, "NOT_FOUND", "Installation not found"),
        );
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_installation",
        arguments: { installationId: 99999 },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("not found");
    });

    it("returns isError with rate limit message on 429", async () => {
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getMeasurementPoint =
        vi
          .fn()
          .mockRejectedValue(
            new AirlyApiError(429, "RATE_LIMIT_EXCEEDED", "Too many requests"),
          );
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 50.062, longitude: 19.941 },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toMatch(/rate limit/i);
    });

    it("returns isError with details on 400", async () => {
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getMeasurementPoint =
        vi.fn().mockRejectedValue(
          new AirlyApiError(
            400,
            "API_REQUEST_INVALID",
            "API Request was not valid",
            {
              violations: [
                {
                  parameter: "lat",
                  message: "latitude must be between -90.0 and +90.0",
                  rejectedValue: 200,
                },
              ],
            },
          ),
        );
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_measurement",
        arguments: { latitude: 200, longitude: 19.941 },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toContain("latitude");
    });

    it("returns sanitized message for non-AirlyApiError exceptions", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const airlyClient = createMockAirlyClient();
      (airlyClient as unknown as Record<string, unknown>).getInstallation = vi
        .fn()
        .mockRejectedValue(new Error("network timeout"));
      const { mcpClient } = await setupTestHarness({ airlyClient });

      const result = await mcpClient.callTool({
        name: "get_installation",
        arguments: { installationId: 204 },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]!
        .text;
      expect(text).toBe("Airly API call failed.");
      expect(text).not.toContain("network timeout");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Airly API call failed with unexpected error:",
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
