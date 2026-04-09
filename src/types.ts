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

export type AirlyIndexType = 'AIRLY_CAQI' | 'CAQI' | 'PIJP';

export type AirlyIndexPollutant =
  | 'PM'
  | 'PM10'
  | 'PM25'
  | 'O3'
  | 'NO2'
  | 'SO2'
  | 'CO'
  | 'ALL';

export interface DefaultCoordinates {
  latitude: number;
  longitude: number;
}
