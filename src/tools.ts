// ABOUTME: MCP tool definitions for querying Airly air quality data.
// ABOUTME: Registers 4 tools on an McpServer that delegate to an AirlyClient.

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AirlyClient, AirlyApiError } from './airly.js';
import type {
  DefaultCoordinates,
  Installation,
  Measurement,
  AveragedValues,
} from './types.js';

const INDEX_TYPE_ENUM = ['AIRLY_CAQI', 'CAQI', 'PIJP'] as const;
const INDEX_POLLUTANT_ENUM = ['PM', 'PM10', 'PM25', 'O3', 'NO2', 'SO2', 'CO', 'ALL'] as const;

function resolveCoordinates(
  args: { latitude?: number; longitude?: number },
  defaultCoords?: DefaultCoordinates,
): { latitude: number; longitude: number } | null {
  if (args.latitude !== undefined && args.longitude !== undefined) {
    return { latitude: args.latitude, longitude: args.longitude };
  }
  if (defaultCoords) {
    return defaultCoords;
  }
  return null;
}

function missingCoordsError() {
  return {
    content: [{ type: 'text' as const, text: 'Latitude and longitude are required. Provide coordinates or configure default coordinates for this server.' }],
    isError: true,
  };
}

function handleApiError(error: unknown) {
  if (error instanceof AirlyApiError) {
    let message = `Airly API error (${error.statusCode}): ${error.message}`;

    if (error.statusCode === 429) {
      message += '\nThe API rate limit has been exceeded. Please wait before making more requests.';
    }

    if (error.statusCode === 400 && error.details?.violations) {
      const violations = error.details.violations
        .map((v) => `  - ${v.parameter}: ${v.message}`)
        .join('\n');
      message += `\nValidation errors:\n${violations}`;
    }

    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }

  const msg = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Unexpected error: ${msg}` }],
    isError: true,
  };
}

function formatMeasurement(measurement: Measurement): string {
  const lines: string[] = [];
  const { current } = measurement;

  lines.push(`Measurement period: ${current.fromDateTime} — ${current.tillDateTime}`);
  lines.push('');

  if (current.values.length > 0) {
    lines.push('Current values:');
    for (const v of current.values) {
      lines.push(`  ${v.name}: ${v.value} µg/m³`);
    }
    lines.push('');
  }

  if (current.indexes.length > 0) {
    for (const idx of current.indexes) {
      lines.push(`Air Quality Index (${idx.name}): ${idx.value} — ${idx.level}`);
      if (idx.description || idx.advice) {
        const advisory = [idx.description, idx.advice].filter(Boolean).join(' ');
        lines.push(`  Advisory (human-readable message from Airly): ${advisory}`);
      }
    }
    lines.push('');
  }

  if (current.standards.length > 0) {
    lines.push('WHO standards:');
    for (const std of current.standards) {
      lines.push(`  ${std.pollutant} at ${std.percent}% of ${std.name} limit (${std.limit} µg/m³)`);
    }
    lines.push('');
  }

  if (measurement.history.length > 0) {
    lines.push('History:');
    for (const period of measurement.history) {
      lines.push(`  ${period.fromDateTime} — ${period.tillDateTime}: ${formatValuesCompact(period)}`);
    }
    lines.push('');
  }

  if (measurement.forecast.length > 0) {
    lines.push('Forecast:');
    for (const period of measurement.forecast) {
      lines.push(`  ${period.fromDateTime} — ${period.tillDateTime}: ${formatValuesCompact(period)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function formatValuesCompact(period: AveragedValues): string {
  return period.values.map((v) => `${v.name}: ${v.value}`).join(', ');
}

function formatInstallation(installation: Installation): string {
  const lines: string[] = [];
  const addr = installation.address;

  lines.push(`Installation #${installation.id}`);
  lines.push(`  Address: ${[addr.city, addr.street, addr.number].filter(Boolean).join(', ')}`);
  lines.push(`  Coordinates: ${installation.location.latitude}, ${installation.location.longitude}`);
  lines.push(`  Elevation: ${installation.elevation} m`);
  lines.push(`  Airly sensor: ${installation.airly ? 'yes' : 'no'}`);

  return lines.join('\n');
}

function formatInstallationList(installations: Installation[]): string {
  if (installations.length === 0) {
    return 'No installations found nearby.';
  }

  return installations.map(formatInstallation).join('\n\n');
}

export function registerTools(
  server: McpServer,
  client: AirlyClient,
  defaultCoords?: DefaultCoordinates,
): void {
  server.tool(
    'get_measurement',
    'Get air quality measurement for a geographic point. Returns current pollutant values, air quality index, and WHO standard comparisons.',
    {
      latitude: z.number().optional().describe('Latitude of the measurement point (-90 to 90)'),
      longitude: z.number().optional().describe('Longitude of the measurement point (-180 to 180)'),
      indexType: z.enum(INDEX_TYPE_ENUM).optional().describe('Air quality index type to use for the response'),
      indexPollutant: z.enum(INDEX_POLLUTANT_ENUM).optional().describe('Pollutant to calculate the index for'),
      skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
    },
    { readOnlyHint: true, openWorldHint: true },
    async (args) => {
      const coords = resolveCoordinates(args, defaultCoords);
      if (!coords) return missingCoordsError();

      try {
        const measurement = await client.getMeasurementPoint(coords.latitude, coords.longitude, {
          indexType: args.indexType,
          indexPollutant: args.indexPollutant,
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatMeasurement(measurement) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  server.tool(
    'get_nearest_installation',
    'Find the nearest Airly air quality monitoring installations to a geographic point.',
    {
      latitude: z.number().optional().describe('Latitude of the search center (-90 to 90)'),
      longitude: z.number().optional().describe('Longitude of the search center (-180 to 180)'),
      maxDistanceKM: z.number().optional().describe('Maximum search radius in kilometers'),
      maxResults: z.number().optional().describe('Maximum number of installations to return (default: 3)'),
      skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
    },
    { readOnlyHint: true, openWorldHint: true },
    async (args) => {
      const coords = resolveCoordinates(args, defaultCoords);
      if (!coords) return missingCoordsError();

      try {
        const installations = await client.getNearestInstallations(coords.latitude, coords.longitude, {
          maxDistanceKM: args.maxDistanceKM,
          maxResults: args.maxResults,
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatInstallationList(installations) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  server.tool(
    'get_installation_measurements',
    'Get air quality measurements for a specific Airly installation by its ID.',
    {
      installationId: z.number().describe('Airly installation ID'),
      indexType: z.enum(INDEX_TYPE_ENUM).optional().describe('Air quality index type to use for the response'),
      indexPollutant: z.enum(INDEX_POLLUTANT_ENUM).optional().describe('Pollutant to calculate the index for'),
      skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
    },
    { readOnlyHint: true, openWorldHint: false },
    async (args) => {
      try {
        const measurement = await client.getMeasurementInstallation(args.installationId, {
          indexType: args.indexType,
          indexPollutant: args.indexPollutant,
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatMeasurement(measurement) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  server.tool(
    'get_installation',
    'Get metadata for a specific Airly installation by its ID, including address, coordinates, and sensor type.',
    {
      installationId: z.number().describe('Airly installation ID'),
      skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
    },
    { readOnlyHint: true, openWorldHint: false },
    async (args) => {
      try {
        const installation = await client.getInstallation(args.installationId, {
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatInstallation(installation) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );
}
