import { db } from "../db";
import { externalSignals } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type AttentionLayer = 1 | 2 | 3 | 4 | 5 | 6;

export interface NormalizedSignalFeatures {
  velocity: number;           // first derivative
  acceleration: number;       // second derivative
  relativeDeviation: number;  // deviation from rolling mean
  anomalyZScore: number;
  attentionDensityScore: number;
}

export interface SignalSourceRegistration {
  name: string;
  layer: AttentionLayer;
  fetchFunction: (keyword: string) => Promise<any>;
  normalizationFunction: (rawData: any) => NormalizedSignalFeatures;
  featureExtractor: (rawData: any) => Record<string, number>;
  updateFrequency: "hourly" | "daily" | "weekly";
}

export interface SignalFetchResult {
  sourceName: string;
  layer: AttentionLayer;
  keyword: string;
  normalizedFeatures: NormalizedSignalFeatures;
  rawData: any;
  fetchedAt: Date;
}

export interface RegisteredSourceInfo {
  name: string;
  layer: AttentionLayer;
  updateFrequency: "hourly" | "daily" | "weekly";
}

// ============================================================================
// In-Memory Registry
// ============================================================================

const signalSourceRegistry = new Map<string, SignalSourceRegistration>();
const lastFetchedMap = new Map<string, Date>();

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

function getRateLimitKey(sourceName: string, keyword: string): string {
  return `${sourceName}:${keyword}`;
}

function getUpdateFrequencyMs(frequency: "hourly" | "daily" | "weekly"): number {
  switch (frequency) {
    case "hourly":
      return 60 * 60 * 1000;
    case "daily":
      return 24 * 60 * 60 * 1000;
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function isRateLimited(
  sourceName: string,
  keyword: string,
  updateFrequency: "hourly" | "daily" | "weekly"
): boolean {
  const key = getRateLimitKey(sourceName, keyword);
  const lastFetch = lastFetchedMap.get(key);

  if (!lastFetch) {
    return false;
  }

  const now = new Date();
  const timeSinceLastFetch = now.getTime() - lastFetch.getTime();
  const rateLimitMs = getUpdateFrequencyMs(updateFrequency);

  return timeSinceLastFetch < rateLimitMs;
}

// ============================================================================
// Signal Source Registration
// ============================================================================

export function registerSignalSource(config: SignalSourceRegistration): void {
  signalSourceRegistry.set(config.name, config);
}

export function getSignalSource(name: string): SignalSourceRegistration | undefined {
  return signalSourceRegistry.get(name);
}

export function getAllSignalSources(): RegisteredSourceInfo[] {
  const sources: RegisteredSourceInfo[] = [];

  const entries = Array.from(signalSourceRegistry.entries());
  for (const [name, config] of entries) {
    sources.push({
      name,
      layer: config.layer,
      updateFrequency: config.updateFrequency,
    });
  }

  return sources;
}

// ============================================================================
// Signal Fetching Helpers
// ============================================================================

export function computeSignalVelocity(
  values: number[],
  timestamps: Date[]
): number {
  if (values.length < 2 || timestamps.length < 2) {
    return 0;
  }

  const latestIdx = values.length - 1;
  const previousIdx = latestIdx - 1;

  const valueDifference = values[latestIdx] - values[previousIdx];
  const timeDifference =
    (timestamps[latestIdx].getTime() - timestamps[previousIdx].getTime()) / 1000; // in seconds

  if (timeDifference === 0) {
    return 0;
  }

  return valueDifference / timeDifference;
}

export function computeSignalAcceleration(
  values: number[],
  timestamps: Date[]
): number {
  if (values.length < 3 || timestamps.length < 3) {
    return 0;
  }

  // Get last two velocity values
  const v2 = computeSignalVelocity(values.slice(-2), timestamps.slice(-2));
  const v1 = computeSignalVelocity(values.slice(-3, -1), timestamps.slice(-3, -1));

  const timeDifference =
    (timestamps[timestamps.length - 1].getTime() -
      timestamps[timestamps.length - 2].getTime()) /
    1000; // in seconds

  if (timeDifference === 0) {
    return 0;
  }

  return (v2 - v1) / timeDifference;
}

function computeRollingMean(values: number[], windowSize: number = 10): number {
  const window = values.slice(-windowSize);
  if (window.length === 0) {
    return 0;
  }
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {
    return 0;
  }
  return (value - mean) / stdDev;
}

function computeRelativeDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const windowSize = Math.min(10, values.length);
  const rollingMean = computeRollingMean(values, windowSize);
  const latestValue = values[values.length - 1];

  if (rollingMean === 0) {
    return 0;
  }

  return (latestValue - rollingMean) / rollingMean;
}

// ============================================================================
// Main Signal Fetching
// ============================================================================

export async function fetchSignal(
  sourceName: string,
  keyword: string
): Promise<SignalFetchResult | null> {
  const source = getSignalSource(sourceName);

  if (!source) {
    console.error(`Signal source not found: ${sourceName}`);
    return null;
  }

  // Check rate limiting
  if (isRateLimited(sourceName, keyword, source.updateFrequency)) {
    console.log(
      `Rate limited: ${sourceName}/${keyword}. Update frequency: ${source.updateFrequency}`
    );
    // Could return cached result here, but for now return null
    return null;
  }

  try {
    // Fetch raw data
    const rawData = await source.fetchFunction(keyword);

    // Normalize features
    const normalizedFeatures = source.normalizationFunction(rawData);

    // Store in database
    const fetchedAt = new Date();
    await db.insert(externalSignals).values({
      sourceName,
      layer: source.layer,
      keyword,
      normalizedFeatures,
      rawData,
      fetchedAt,
    });

    // Update rate limit tracking
    const key = getRateLimitKey(sourceName, keyword);
    lastFetchedMap.set(key, fetchedAt);

    console.log(`Fetched signal from ${sourceName} for keyword: ${keyword}`);

    return {
      sourceName,
      layer: source.layer,
      keyword,
      normalizedFeatures,
      rawData,
      fetchedAt,
    };
  } catch (error) {
    console.error(`Error fetching signal from ${sourceName}:`, error);
    return null;
  }
}

export async function fetchAllSignals(
  keyword: string
): Promise<SignalFetchResult[]> {
  const sources = getAllSignalSources();
  const results: SignalFetchResult[] = [];

  for (const source of sources) {
    try {
      const result = await fetchSignal(source.name, keyword);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error fetching signal from ${source.name}:`, error);
      // Continue with next source instead of failing
    }
  }

  return results;
}

// ============================================================================
// Signal History
// ============================================================================

export async function getSignalHistory(
  sourceName: string,
  keyword: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const results = await db
      .select()
      .from(externalSignals)
      .where(
        and(
          eq(externalSignals.sourceName, sourceName),
          eq(externalSignals.keyword, keyword)
        )
      )
      .orderBy(desc(externalSignals.fetchedAt))
      .limit(limit);

    return results;
  } catch (error) {
    console.error(
      `Error fetching signal history for ${sourceName}/${keyword}:`,
      error
    );
    return [];
  }
}
