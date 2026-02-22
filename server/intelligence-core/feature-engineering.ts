interface DatasetTypeRegistration {
  datasetType: string;
  featureExtractor: (rawData: any) => Record<string, number>;
  targetMetricDefinition: { name: string; extractFn: (rawData: any) => number };
}

interface FeatureStats {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

const datasetTypeRegistry = new Map<string, DatasetTypeRegistration>();

export function registerDatasetType(config: DatasetTypeRegistration): void {
  datasetTypeRegistry.set(config.datasetType, config);
}

export function getDatasetType(datasetType: string): DatasetTypeRegistration | undefined {
  return datasetTypeRegistry.get(datasetType);
}

export function computeFeatureStats(featureArrays: Record<string, number[]>): Record<string, FeatureStats> {
  const stats: Record<string, FeatureStats> = {};

  for (const [featureName, values] of Object.entries(featureArrays)) {
    if (values.length === 0) {
      stats[featureName] = { min: 0, max: 0, mean: 0, stdDev: 0 };
      continue;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    stats[featureName] = { min, max, mean, stdDev };
  }

  return stats;
}

export function normalizeFeatures(
  features: Record<string, number>,
  stats: Record<string, FeatureStats>
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [key, value] of Object.entries(features)) {
    const s = stats[key];
    if (!s || s.max === s.min) {
      normalized[key] = 0;
    } else {
      normalized[key] = Math.max(0, Math.min(1, (value - s.min) / (s.max - s.min)));
    }
  }

  return normalized;
}

export function extractFeaturesForRecord(
  datasetType: string,
  rawData: any
): { features: Record<string, number>; target: number } | null {
  const registration = datasetTypeRegistry.get(datasetType);
  if (!registration) {
    return null;
  }

  const features = registration.featureExtractor(rawData);
  const target = registration.targetMetricDefinition.extractFn(rawData);

  return { features, target };
}

const HUMOR_CATEGORIES = [
  "girlfriend_expensive",
  "wife_expensive",
  "kids_expensive",
  "walletus_maximus",
  "bluechew_wallet",
  "buddy_got_raise",
  "broke_boys",
  "bar_stool_economics",
  "chrome_addiction",
  "cubicle_vs_contractor",
];

const PLATFORM_ENCODING: Record<string, number> = {
  youtube: 0.2,
  tiktok: 0.4,
  instagram: 0.6,
  facebook: 0.8,
};

function videoAdFeatureExtractor(rawData: any): Record<string, number> {
  const hp = rawData.humor_performance || rawData;

  const setupDuration = Number(hp.setup_duration ?? hp.setupDuration ?? 0);
  const punchlineTiming = Number(hp.punchline_timing ?? hp.punchlineTiming ?? 0);
  const duration = Number(hp.total_duration ?? hp.totalDuration ?? 0);
  const deliveryPaceWps = Number(hp.delivery_pace_wps ?? hp.deliveryPaceWps ?? 0);

  const toneShiftCount = Number(hp.tone_shift_count ?? hp.toneShiftCount ?? 0);
  const toneShiftDensity = duration > 0 ? toneShiftCount / duration : 0;

  const escalationBeats = hp.escalation_beats ?? hp.escalationBeats ?? [];
  const escalationLength = Array.isArray(escalationBeats) ? escalationBeats.length : 0;
  const escalationDensity = duration > 0 ? escalationLength / duration : 0;

  const retentionCurve = hp.retention_curve ?? hp.retentionCurve ?? [];
  let retentionSlope = 0;
  let retentionDropPoint = 1.0;

  if (Array.isArray(retentionCurve) && retentionCurve.length >= 2) {
    const first = Number(retentionCurve[0]) || 0;
    const last = Number(retentionCurve[retentionCurve.length - 1]) || 0;
    retentionSlope = (last - first) / retentionCurve.length;

    const dropIndex = retentionCurve.findIndex((v: any) => Number(v) < 50);
    retentionDropPoint = dropIndex >= 0 ? dropIndex / retentionCurve.length : 1.0;
  }

  const wordCount = Number(hp.word_count ?? hp.wordCount ?? 0);

  const platform = String(hp.platform ?? "other").toLowerCase();
  const platformEncoding = PLATFORM_ENCODING[platform] ?? 1.0;

  const humorCategory = String(hp.humor_category ?? hp.humorCategory ?? "");
  const categoryIndex = HUMOR_CATEGORIES.indexOf(humorCategory);
  const categoryEncoding = categoryIndex >= 0 ? (categoryIndex + 1) / 10 : 0;

  const historicalPerformanceDelta = 0;

  return {
    setupDuration,
    punchlineTiming,
    duration,
    deliveryPaceWps,
    toneShiftDensity,
    escalationDensity,
    retentionSlope,
    retentionDropPoint,
    wordCount,
    platformEncoding,
    categoryEncoding,
    historicalPerformanceDelta,
  };
}

function videoAdTargetExtractor(rawData: any): number {
  const hp = rawData.humor_performance || rawData;
  return Number(hp.engagement_rate ?? hp.engagementRate ?? 0);
}

registerDatasetType({
  datasetType: "video_ads",
  featureExtractor: videoAdFeatureExtractor,
  targetMetricDefinition: {
    name: "engagement_rate",
    extractFn: videoAdTargetExtractor,
  },
});

registerDatasetType({
  datasetType: "video_ads_outpost",
  featureExtractor: videoAdFeatureExtractor,
  targetMetricDefinition: {
    name: "engagement_rate",
    extractFn: videoAdTargetExtractor,
  },
});
