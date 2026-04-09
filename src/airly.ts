// ABOUTME: Airly REST API v2 client with LRU read-through cache.
// ABOUTME: Handles auth, request building, error mapping, and rate limit tracking.

import { LRUCache } from 'lru-cache';
import type {
  Installation,
  Measurement,
  IndexType,
  MeasurementType,
  StandardType,
  AirlyErrorResponse,
  AirlyIndexType,
  AirlyIndexPollutant,
} from './types.js';

const BASE_URL = 'https://airapi.airly.eu/v2';
const CACHE_MAX_ENTRIES = 100;
const CACHE_TTL_MS = 15 * 60 * 1000;

export class AirlyApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: AirlyErrorResponse['details'],
  ) {
    super(message);
    this.name = 'AirlyApiError';
  }
}

interface MeasurementOptions {
  indexType?: AirlyIndexType;
  indexPollutant?: AirlyIndexPollutant;
  skipCache?: boolean;
}

interface NearestOptions {
  maxDistanceKM?: number;
  maxResults?: number;
  skipCache?: boolean;
}

export class AirlyClient {
  private readonly apiToken: string;
  private readonly language: string;
  private readonly cache: LRUCache<string, object>;
  private readonly metaCache: LRUCache<string, object>;

  constructor(apiToken: string, options?: { language?: string }) {
    this.apiToken = apiToken;
    this.language = options?.language ?? 'en';
    this.cache = new LRUCache<string, object>({
      max: CACHE_MAX_ENTRIES,
      ttl: CACHE_TTL_MS,
    });
    this.metaCache = new LRUCache<string, object>({
      max: 10,
    });
  }

  async getNearestInstallations(
    lat: number,
    lng: number,
    options?: NearestOptions,
  ): Promise<Installation[]> {
    const params: Record<string, string> = {
      lat: String(lat),
      lng: String(lng),
    };
    if (options?.maxDistanceKM !== undefined) params.maxDistanceKM = String(options.maxDistanceKM);
    if (options?.maxResults !== undefined) params.maxResults = String(options.maxResults);

    return this.request<Installation[]>('/installations/nearest', params, {
      skipCache: options?.skipCache,
      roundCoords: { lat, lng },
    });
  }

  async getInstallation(installationId: number, options?: { skipCache?: boolean }): Promise<Installation> {
    return this.request<Installation>(`/installations/${installationId}`, undefined, {
      skipCache: options?.skipCache,
    });
  }

  async getMeasurementPoint(
    lat: number,
    lng: number,
    options?: MeasurementOptions,
  ): Promise<Measurement> {
    const params: Record<string, string> = {
      lat: String(lat),
      lng: String(lng),
    };
    if (options?.indexType) params.indexType = options.indexType;
    if (options?.indexPollutant) params.indexPollutant = options.indexPollutant;

    return this.request<Measurement>('/measurements/point', params, {
      skipCache: options?.skipCache,
      roundCoords: { lat, lng },
    });
  }

  async getMeasurementInstallation(
    installationId: number,
    options?: MeasurementOptions,
  ): Promise<Measurement> {
    const params: Record<string, string> = {
      installationId: String(installationId),
    };
    if (options?.indexType) params.indexType = options.indexType;
    if (options?.indexPollutant) params.indexPollutant = options.indexPollutant;

    return this.request<Measurement>('/measurements/installation', params, {
      skipCache: options?.skipCache,
    });
  }

  async getIndexes(): Promise<IndexType[]> {
    return this.requestMeta<IndexType[]>('/meta/indexes');
  }

  async getMeasurementTypes(): Promise<MeasurementType[]> {
    return this.requestMeta<MeasurementType[]>('/meta/measurements');
  }

  async getStandards(): Promise<StandardType[]> {
    return this.requestMeta<StandardType[]>('/meta/standards');
  }

  private buildCacheKey(
    path: string,
    params?: Record<string, string>,
    roundCoords?: { lat: number; lng: number },
  ): string {
    const normalizedParams = { ...params };

    if (roundCoords) {
      normalizedParams.lat = roundCoords.lat.toFixed(4);
      normalizedParams.lng = roundCoords.lng.toFixed(4);
    }

    const sortedEntries = Object.entries(normalizedParams).sort(([a], [b]) => a.localeCompare(b));
    return `${path}?${sortedEntries.map(([k, v]) => `${k}=${v}`).join('&')}`;
  }

  private async request<T>(
    path: string,
    params?: Record<string, string>,
    options?: { skipCache?: boolean; roundCoords?: { lat: number; lng: number } },
  ): Promise<T> {
    const cacheKey = this.buildCacheKey(path, params, options?.roundCoords);

    if (!options?.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) return cached as T;
    }

    const result = await this.fetchFromApi<T>(path, params);
    this.cache.set(cacheKey, result as object);
    return result;
  }

  private async requestMeta<T>(path: string): Promise<T> {
    const cached = this.metaCache.get(path);
    if (cached !== undefined) return cached as T;

    const result = await this.fetchFromApi<T>(path);
    this.metaCache.set(path, result as object);
    return result;
  }

  private async fetchFromApi<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers = new Headers({
      apikey: this.apiToken,
      Accept: 'application/json',
      'Accept-Language': this.language,
    });

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      let body: AirlyErrorResponse;
      try {
        body = (await response.json()) as AirlyErrorResponse;
      } catch {
        throw new AirlyApiError(
          response.status,
          'UNKNOWN',
          `Airly API returned HTTP ${response.status}`,
        );
      }
      throw new AirlyApiError(response.status, body.errorCode, body.message, body.details);
    }

    return (await response.json()) as T;
  }
}
