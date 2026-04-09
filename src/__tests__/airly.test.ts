// ABOUTME: Unit tests for the Airly API client.
// ABOUTME: All tests use mocked fetch — no real API calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AirlyClient, AirlyApiError } from '../airly.js';
import type { Installation, Measurement, IndexType, MeasurementType, StandardType } from '../types.js';

const TEST_API_KEY = 'test-api-key';

const mockInstallation: Installation = {
  id: 204,
  location: { latitude: 50.062006, longitude: 19.940984 },
  locationId: 204,
  address: {
    country: 'Poland',
    city: 'Kraków',
    street: 'Mikołajska',
    number: '4B',
    displayAddress1: 'Kraków',
    displayAddress2: 'Mikołajska',
  },
  elevation: 220.38,
  airly: true,
  sponsor: {
    id: 7,
    name: 'KrakówOddycha',
    description: 'Airly Sensor is part of action',
    logo: 'https://cdn.airly.org/logo/KrakówOddycha.jpg',
    link: 'https://sponsor_home_address.pl',
    displayName: 'KrakówOddycha',
  },
};

const mockMeasurement: Measurement = {
  current: {
    fromDateTime: '2024-08-24T08:24:48.652Z',
    tillDateTime: '2024-08-24T09:24:48.652Z',
    values: [
      { name: 'PM25', value: 18.7 },
      { name: 'PM10', value: 35.53 },
    ],
    indexes: [
      {
        name: 'AIRLY_CAQI',
        value: 35.53,
        level: 'LOW',
        description: 'Good air.',
        advice: 'You can go outside without worries.',
        color: '#D1CF1E',
      },
    ],
    standards: [{ name: 'WHO', pollutant: 'PM25', limit: 25, percent: 74.81 }],
  },
  history: [],
  forecast: [],
};

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

function mockFetchResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-ratelimit-limit-day': '100',
    'x-ratelimit-remaining-day': '95',
    ...headers,
  };
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(defaultHeaders),
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    headers: new Headers({
      'content-type': 'application/json',
      'x-ratelimit-limit-day': '100',
      'x-ratelimit-remaining-day': '0',
    }),
    json: () => Promise.resolve(body),
  });
}

describe('AirlyClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('request building', () => {
    it('builds correct URL with base path and query params', async () => {
      const fetchMock = mockFetchResponse([mockInstallation]);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getNearestInstallations(50.062, 19.941, { maxDistanceKM: 5, maxResults: 3 });

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.origin + url.pathname).toBe('https://airapi.airly.eu/v2/installations/nearest');
      expect(url.searchParams.get('lat')).toBe('50.062');
      expect(url.searchParams.get('lng')).toBe('19.941');
      expect(url.searchParams.get('maxDistanceKM')).toBe('5');
      expect(url.searchParams.get('maxResults')).toBe('3');
    });

    it('sends apikey, Accept, and Accept-Language headers', async () => {
      const fetchMock = mockFetchResponse([mockInstallation]);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY, { language: 'pl' });

      await client.getNearestInstallations(50.062, 19.941);

      const requestInit = fetchMock.mock.calls[0][1];
      expect(requestInit.headers.get('apikey')).toBe(TEST_API_KEY);
      expect(requestInit.headers.get('Accept')).toBe('application/json');
      expect(requestInit.headers.get('Accept-Language')).toBe('pl');
    });

    it('defaults Accept-Language to en', async () => {
      const fetchMock = mockFetchResponse([mockInstallation]);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getNearestInstallations(50.062, 19.941);

      const requestInit = fetchMock.mock.calls[0][1];
      expect(requestInit.headers.get('Accept-Language')).toBe('en');
    });
  });

  describe('installations', () => {
    it('getNearestInstallations returns parsed Installation[]', async () => {
      globalThis.fetch = mockFetchResponse([mockInstallation]);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getNearestInstallations(50.062, 19.941);

      expect(result).toEqual([mockInstallation]);
    });

    it('getInstallation returns parsed Installation', async () => {
      globalThis.fetch = mockFetchResponse(mockInstallation);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getInstallation(204);

      expect(result).toEqual(mockInstallation);
    });
  });

  describe('measurements', () => {
    it('getMeasurementPoint returns parsed Measurement', async () => {
      globalThis.fetch = mockFetchResponse(mockMeasurement);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getMeasurementPoint(50.062, 19.941);

      expect(result).toEqual(mockMeasurement);
    });

    it('getMeasurementPoint passes indexType and indexPollutant params', async () => {
      const fetchMock = mockFetchResponse(mockMeasurement);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getMeasurementPoint(50.062, 19.941, {
        indexType: 'CAQI',
        indexPollutant: 'O3',
      });

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.searchParams.get('indexType')).toBe('CAQI');
      expect(url.searchParams.get('indexPollutant')).toBe('O3');
    });

    it('getMeasurementInstallation returns parsed Measurement', async () => {
      globalThis.fetch = mockFetchResponse(mockMeasurement);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getMeasurementInstallation(204);

      expect(result).toEqual(mockMeasurement);
    });
  });

  describe('meta', () => {
    it('getIndexes returns parsed IndexType[]', async () => {
      globalThis.fetch = mockFetchResponse(mockIndexTypes);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getIndexes();

      expect(result).toEqual(mockIndexTypes);
    });

    it('getMeasurementTypes returns parsed MeasurementType[]', async () => {
      globalThis.fetch = mockFetchResponse(mockMeasurementTypes);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getMeasurementTypes();

      expect(result).toEqual(mockMeasurementTypes);
    });

    it('getStandards returns parsed StandardType[]', async () => {
      globalThis.fetch = mockFetchResponse(mockStandardTypes);
      const client = new AirlyClient(TEST_API_KEY);

      const result = await client.getStandards();

      expect(result).toEqual(mockStandardTypes);
    });
  });

  describe('error handling', () => {
    it('throws AirlyApiError on 400 with validation details', async () => {
      globalThis.fetch = mockFetchError(400, {
        errorCode: 'API_REQUEST_INVALID',
        message: 'API Request was not valid',
        details: {
          violations: [{ parameter: 'lat', message: 'latitude value must be between -90.0 and +90.0', rejectedValue: 200 }],
        },
      });
      const client = new AirlyClient(TEST_API_KEY);

      await expect(client.getMeasurementPoint(200, 19.941)).rejects.toThrow(AirlyApiError);

      try {
        await client.getMeasurementPoint(200, 19.941, { skipCache: true });
      } catch (e) {
        expect(e).toBeInstanceOf(AirlyApiError);
        const error = e as AirlyApiError;
        expect(error.statusCode).toBe(400);
        expect(error.errorCode).toBe('API_REQUEST_INVALID');
        expect(error.details?.violations).toHaveLength(1);
      }
    });

    it('throws AirlyApiError on 401', async () => {
      globalThis.fetch = mockFetchError(401, { errorCode: 'UNAUTHORIZED', message: 'Unauthorized' });
      const client = new AirlyClient(TEST_API_KEY);

      await expect(client.getInstallation(204)).rejects.toThrow(AirlyApiError);
    });

    it('throws AirlyApiError on 404', async () => {
      globalThis.fetch = mockFetchError(404, { errorCode: 'NOT_FOUND', message: 'Not found' });
      const client = new AirlyClient(TEST_API_KEY);

      await expect(client.getInstallation(99999)).rejects.toThrow(AirlyApiError);
    });

    it('throws AirlyApiError on 429 with rate limit exhausted', async () => {
      globalThis.fetch = mockFetchError(429, {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      });
      const client = new AirlyClient(TEST_API_KEY);

      try {
        await client.getMeasurementPoint(50.062, 19.941);
      } catch (e) {
        expect(e).toBeInstanceOf(AirlyApiError);
        const error = e as AirlyApiError;
        expect(error.statusCode).toBe(429);
      }
    });

    it('throws AirlyApiError on 500', async () => {
      globalThis.fetch = mockFetchError(500, { errorCode: 'INTERNAL_ERROR', message: 'Server error' });
      const client = new AirlyClient(TEST_API_KEY);

      await expect(client.getMeasurementPoint(50.062, 19.941)).rejects.toThrow(AirlyApiError);
    });
  });

  describe('caching', () => {
    it('returns cached result on second call with same params', async () => {
      const fetchMock = mockFetchResponse(mockMeasurement);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      const result1 = await client.getMeasurementPoint(50.062, 19.941);
      const result2 = await client.getMeasurementPoint(50.062, 19.941);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('bypasses cache when skipCache is true', async () => {
      const fetchMock = mockFetchResponse(mockMeasurement);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getMeasurementPoint(50.062, 19.941);
      await client.getMeasurementPoint(50.062, 19.941, { skipCache: true });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rounds coordinates to 4 decimal places for cache key', async () => {
      const fetchMock = mockFetchResponse(mockMeasurement);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getMeasurementPoint(50.06200123, 19.94098456);
      await client.getMeasurementPoint(50.0620, 19.9410);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('caches meta requests indefinitely', async () => {
      const fetchMock = mockFetchResponse(mockIndexTypes);
      globalThis.fetch = fetchMock;
      const client = new AirlyClient(TEST_API_KEY);

      await client.getIndexes();
      await client.getIndexes();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('evicts least recently used entries when max size exceeded', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockMeasurement),
        });
      });

      const client = new AirlyClient(TEST_API_KEY);

      // Fill cache with 100 entries
      for (let i = 0; i < 100; i++) {
        await client.getMeasurementPoint(i * 0.01, 19.941);
      }
      expect(callCount).toBe(100);

      // Add one more to trigger eviction
      await client.getMeasurementPoint(99.0, 19.941);
      expect(callCount).toBe(101);

      // The first entry should have been evicted
      await client.getMeasurementPoint(0.0, 19.941);
      expect(callCount).toBe(102);
    });
  });
});
