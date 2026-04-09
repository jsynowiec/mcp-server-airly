// ABOUTME: Registers MCP prompts for air quality queries, forecasts, and station lookups.
// ABOUTME: Each prompt returns an LLM instruction message referencing the appropriate Airly tool.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DefaultCoordinates } from './types.js';

const COORDINATE_NOTE = [
  'IMPORTANT: The latitude and longitude values are WGS 84 decimal degrees.',
  'If the user provides a place name instead of coordinates, you must resolve it to coordinates yourself:',
  'approximate from your own knowledge, ask the user, or use an external geocoding tool.',
].join(' ');

export function registerPrompts(
  server: McpServer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _defaultCoords?: DefaultCoordinates,
): void {
  server.registerPrompt(
    'check_air_quality',
    {
      description: 'Check current air quality at a location',
      argsSchema: {
        latitude: z.string().describe('Latitude in WGS 84 decimal degrees'),
        longitude: z.string().describe('Longitude in WGS 84 decimal degrees'),
      },
    },
    ({ latitude, longitude }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Call the get_measurement tool with latitude ${latitude} and longitude ${longitude}.`,
              'Then explain the results to the user:',
              '- Explain the air quality index level in plain, non-technical language.',
              '- Highlight any health advisories from the advice text.',
              '- Note any WHO standard exceedances.',
              '',
              COORDINATE_NOTE,
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'air_quality_forecast',
    {
      description: 'Get the air quality forecast for the next 24 hours',
      argsSchema: {
        latitude: z.string().describe('Latitude in WGS 84 decimal degrees'),
        longitude: z.string().describe('Longitude in WGS 84 decimal degrees'),
      },
    },
    ({ latitude, longitude }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Call the get_measurement tool with latitude ${latitude}, longitude ${longitude}, and include "forecast".`,
              'Then summarize the forecast for the user:',
              '- Summarize the forecast trend over the next 24 hours.',
              '- Flag any expected deterioration in air quality.',
              '- Provide outdoor activity recommendations based on the forecast.',
              '',
              COORDINATE_NOTE,
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'find_nearest_station',
    {
      description: 'Find the nearest air quality monitoring station',
      argsSchema: {
        latitude: z.string().describe('Latitude in WGS 84 decimal degrees'),
        longitude: z.string().describe('Longitude in WGS 84 decimal degrees'),
        maxDistanceKM: z
          .string()
          .optional()
          .describe('Maximum search radius in kilometers'),
      },
    },
    ({ latitude, longitude, maxDistanceKM }) => {
      const distancePart = maxDistanceKM
        ? ` with a maximum search distance of ${maxDistanceKM} km`
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Call the get_nearest_installation tool with latitude ${latitude} and longitude ${longitude}${distancePart}.`,
                'Then present the station details to the user:',
                '- Include the distance from the requested location.',
                '- Include the station address.',
                '- Note whether it is an Airly device.',
                '',
                COORDINATE_NOTE,
              ].join('\n'),
            },
          },
        ],
      };
    },
  );
}
