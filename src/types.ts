// ABOUTME: TypeScript interfaces for Airly REST API v2 response shapes.
// ABOUTME: Derived from https://github.com/airly-eu/api-docs/tree/master/en

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Address {
  country: string | null;
  city: string | null;
  street: string | null;
  number: string | null;
  displayAddress1: string | null;
  displayAddress2: string | null;
}

export interface Sponsor {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  link: string | null;
  displayName: string | null;
}

export interface Installation {
  id: number;
  location: Location;
  locationId: number;
  address: Address;
  elevation: number;
  airly: boolean;
  sponsor: Sponsor;
}

export interface MeasurementValue {
  name: string;
  value: number;
}

export interface IndexValue {
  name: string;
  value: number;
  level: string;
  description: string;
  advice: string;
  color: string;
}

export interface StandardValue {
  name: string;
  pollutant: string;
  limit: number;
  percent: number;
}

export interface AveragedValues {
  fromDateTime: string;
  tillDateTime: string;
  values: MeasurementValue[];
  indexes: IndexValue[];
  standards: StandardValue[];
}

export interface Measurement {
  current: AveragedValues;
  history: AveragedValues[];
  forecast: AveragedValues[];
}

export interface IndexLevel {
  values: string;
  level: string;
  description: string;
  color: string;
}

export interface IndexType {
  name: string;
  levels: IndexLevel[];
}

export interface MeasurementType {
  name: string;
  label: string;
  unit: string;
}

export interface StandardType {
  name: string;
  standardLimits: Record<string, number>;
}

export interface AirlyErrorResponse {
  errorCode: string;
  message: string;
  details?: {
    violations?: Array<{
      parameter: string;
      message: string;
      rejectedValue: unknown;
    }>;
  };
}

export const INDEX_TYPE_ENUM = ["AIRLY_CAQI", "CAQI", "PIJP"] as const;
export type AirlyIndexType = (typeof INDEX_TYPE_ENUM)[number];

export const INDEX_POLLUTANT_ENUM = [
  "PM",
  "PM10",
  "PM25",
  "O3",
  "NO2",
  "SO2",
  "CO",
  "ALL",
] as const;
export type AirlyIndexPollutant = (typeof INDEX_POLLUTANT_ENUM)[number];

export const INCLUDE_ENUM = ["current", "history", "forecast", "all"] as const;
export type IncludeSlice = (typeof INCLUDE_ENUM)[number];

// NOTE: Can become stale; New Airly measurement types will render without units
export const MEASUREMENT_UNITS: Record<string, string> = {
  PM1: "µg/m³",
  PM25: "µg/m³",
  PM10: "µg/m³",
  O3: "µg/m³",
  NO2: "µg/m³",
  SO2: "µg/m³",
  CO: "µg/m³",
  TEMPERATURE: "°C",
  HUMIDITY: "%",
  PRESSURE: "hPa",
};
