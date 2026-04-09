// ABOUTME: MCP tool definitions for querying Airly air quality data.
// ABOUTME: Registers 4 tools on an McpServer that delegate to an AirlyClient.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Inline `type` on AirlyClient because AirlyApiError needs a runtime import from the same module
import { type AirlyClient, AirlyApiError } from './airly.js';
import type {
  DefaultCoordinates,
  Installation,
  Measurement,
  AveragedValues,
} from './types.js';

const INDEX_TYPE_ENUM = ['AIRLY_CAQI', 'CAQI', 'PIJP'] as const;
const INDEX_POLLUTANT_ENUM = ['PM', 'PM10', 'PM25', 'O3', 'NO2', 'SO2', 'CO', 'ALL'] as const;
const INCLUDE_ENUM = ['current', 'history', 'forecast', 'all'] as const;
type IncludeSlice = (typeof INCLUDE_ENUM)[number];

const MEASUREMENT_UNITS: Record<string, string> = {
  PM1: 'µg/m³',
  PM25: 'µg/m³',
  PM10: 'µg/m³',
  O3: 'µg/m³',
  NO2: 'µg/m³',
  SO2: 'µg/m³',
  CO: 'µg/m³',
  TEMPERATURE: '°C',
  HUMIDITY: '%',
  PRESSURE: 'hPa',
};

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

  console.error('Airly API call failed with unexpected error:', error);
  return {
    content: [{ type: 'text' as const, text: 'Airly API call failed.' }],
    isError: true,
  };
}

function formatMeasurement(measurement: Measurement, include: IncludeSlice = 'current'): string {
  const lines: string[] = [];
  const showCurrent = include === 'current' || include === 'all';
  const showHistory = include === 'history' || include === 'all';
  const showForecast = include === 'forecast' || include === 'all';
  const { current } = measurement;

  if (showCurrent) {
    lines.push(`Measurement period: ${current.fromDateTime} — ${current.tillDateTime}`);
    lines.push('');

    if (current.values.length > 0) {
      lines.push('Current values:');
      for (const v of current.values) {
        const unit = MEASUREMENT_UNITS[v.name];
        lines.push(`  ${v.name}: ${v.value}${unit ? ` ${unit}` : ''}`);
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
  }

  if (showHistory && measurement.history.length > 0) {
    lines.push('History (last 24 full hours, hourly averages):');
    for (const period of measurement.history) {
      lines.push(`  ${period.fromDateTime} — ${period.tillDateTime}: ${formatValuesCompact(period)}`);
    }
    lines.push('');
  }

  if (showForecast && measurement.forecast.length > 0) {
    lines.push('Forecast (next 24 hours, hourly averages):');
    for (const period of measurement.forecast) {
      lines.push(`  ${period.fromDateTime} — ${period.tillDateTime}: ${formatValuesCompact(period)}`);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    const sliceNames: Record<IncludeSlice, string> = {
      current: 'current',
      history: 'history',
      forecast: 'forecast',
      all: 'measurement',
    };
    return `No ${sliceNames[include]} data available.`;
  }

  return lines.join('\n').trimEnd();
}

function formatValuesCompact(period: AveragedValues): string {
  return period.values.map((v) => {
    const unit = MEASUREMENT_UNITS[v.name];
    return `${v.name}: ${v.value}${unit ? ` ${unit}` : ''}`;
  }).join(', ');
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
  server.registerTool(
    'get_measurement',
    {
      description: 'Get air quality measurement for a geographic point. Data is structured into three slices: "current" (last 60min moving average, up to 3h old for third-party stations), "history" (24 hourly averages for the last 24 full hours), and "forecast" (24 anticipated hourly averages for the next 24 hours). Together, history and forecast form a continuous 48-hour sequence.',
      inputSchema: {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude in decimal degrees'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude in decimal degrees'),
        include: z.enum(INCLUDE_ENUM).default('current').describe('Data slice to return: "current" (last 60min average, default), "history" (24h hourly), "forecast" (next 24h hourly), or "all"'),
        indexType: z.enum(INDEX_TYPE_ENUM).default('AIRLY_CAQI').describe('Air quality index type'),
        indexPollutant: z.enum(INDEX_POLLUTANT_ENUM).default('PM').describe('Pollutant set for index calculation'),
        skipCache: z.boolean().optional().describe('Bypass the 15-minute cache and fetch fresh data'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => {
      const coords = resolveCoordinates(args, defaultCoords);
      if (!coords) return missingCoordsError();

      try {
        const measurement = await client.getMeasurementPoint(coords.latitude, coords.longitude, {
          indexType: args.indexType,
          indexPollutant: args.indexPollutant,
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatMeasurement(measurement, args.include) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  server.registerTool(
    'get_nearest_installation',
    {
      description: 'Find the nearest Airly air quality monitoring installations to a geographic point.',
      inputSchema: {
        latitude: z.number().optional().describe('Latitude of the search center (-90 to 90)'),
        longitude: z.number().optional().describe('Longitude of the search center (-180 to 180)'),
        maxDistanceKM: z.number().default(3.0).describe('Maximum search radius in kilometers'),
        maxResults: z.number().default(1).describe('Maximum number of installations to return'),
        skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
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

  server.registerTool(
    'get_installation_measurements',
    {
      description: 'Get air quality measurements for a specific Airly installation by its ID. Data is structured into three slices: "current" (last 60min moving average), "history" (24 hourly averages for the last 24 full hours), and "forecast" (24 anticipated hourly averages for the next 24 hours).',
      inputSchema: {
        installationId: z.number().describe('Airly installation ID'),
        include: z.enum(INCLUDE_ENUM).default('current').describe('Data slice to return: "current" (last 60min average, default), "history" (24h hourly), "forecast" (next 24h hourly), or "all"'),
        indexType: z.enum(INDEX_TYPE_ENUM).default('AIRLY_CAQI').describe('Air quality index type'),
        indexPollutant: z.enum(INDEX_POLLUTANT_ENUM).default('PM').describe('Pollutant set for index calculation'),
        skipCache: z.boolean().optional().describe('Bypass the 15-minute cache and fetch fresh data'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const measurement = await client.getMeasurementInstallation(args.installationId, {
          indexType: args.indexType,
          indexPollutant: args.indexPollutant,
          skipCache: args.skipCache,
        });
        return { content: [{ type: 'text', text: formatMeasurement(measurement, args.include) }] };
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  server.registerTool(
    'get_installation',
    {
      description: 'Get metadata for a specific Airly installation by its ID, including address, coordinates, and sensor type.',
      inputSchema: {
        installationId: z.number().describe('Airly installation ID'),
        skipCache: z.boolean().optional().describe('Bypass cache and fetch fresh data from the API'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
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
