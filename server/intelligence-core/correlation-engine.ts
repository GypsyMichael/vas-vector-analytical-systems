import { db } from "../db";
import { externalSignals, crossLayerPatterns } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// ============================================================================
// Types - Part 1: Cross-Layer Correlation
// ============================================================================

export interface CrossLayerCorrelation {
  sourceLayer: number;
  targetLayer: number;
  keyword: string;
  lagDays: number;
  correlationStrength: number; // -1 to 1
  confidence: number; // 0 to 1
  sampleSize: number;
}

// ============================================================================
// Types - Part 2: Attention Migration Index (AMI)
// ============================================================================

export type AMIStage =
  | "early_noise"
  | "search_growth"
  | "buyer_interest"
  | "media_amplification";

export interface AMIScore {
  ami: number; // 0 to 1 composite score
  stage: AMIStage;
  confidence: number;
  components: {
    culturalSpikeScore: number;
    searchAccelerationScore: number;
    marketplaceRankDeltaScore: number;
    mediaAmplificationScore: number;
  };
  layerScores: Record<number, number>;
}

// ============================================================================
// Part 1: Cross-Layer Correlation Functions
// ============================================================================

/**
 * Computes the Pearson correlation coefficient between two arrays
 * Standard formula: r = cov(x,y) / (stddev(x) * stddev(y))
 * Returns value between -1 and 1
 */
export function computePearsonCorrelation(
  x: number[],
  y: number[]
): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;

  // Compute means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Compute covariance and standard deviations
  let covariance = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covariance += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const stdX = Math.sqrt(varX / n);
  const stdY = Math.sqrt(varY / n);

  // Return 0 if either standard deviation is 0 (no variance)
  if (stdX === 0 || stdY === 0) {
    return 0;
  }

  const pearsonR = (covariance / n) / (stdX * stdY);

  // Clamp result to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, pearsonR));
}

/**
 * Detects lag correlation between source and target signals
 * For each lag from 0 to maxLagDays, aligns source[t] with target[t + lag]
 * and computes Pearson correlation coefficient
 * Returns the lag with highest absolute correlation
 */
export function detectLagCorrelation(
  sourceSignals: Array<{ value: number; timestamp: Date }>,
  targetSignals: Array<{ value: number; timestamp: Date }>,
  maxLagDays: number = 14
): {
  lagDays: number;
  correlationStrength: number;
  sampleSize: number;
} {
  // Sort signals by timestamp
  const sortedSource = [...sourceSignals].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const sortedTarget = [...targetSignals].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let bestLag = 0;
  let bestCorrelation = 0;
  let bestSampleSize = 0;

  const msPerDay = 24 * 60 * 60 * 1000;

  // Test each lag from 0 to maxLagDays
  for (let lag = 0; lag <= maxLagDays; lag++) {
    const lagMs = lag * msPerDay;

    // Align source[t] with target[t + lag]
    const alignedSourceValues: number[] = [];
    const alignedTargetValues: number[] = [];

    for (const sourcePoint of sortedSource) {
      const targetTime = sourcePoint.timestamp.getTime() + lagMs;

      // Find matching target point (closest to targetTime)
      let bestMatch: (typeof sortedTarget)[0] | null = null;
      let bestDiff = Infinity;

      for (const targetPoint of sortedTarget) {
        const diff = Math.abs(targetPoint.timestamp.getTime() - targetTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = targetPoint;
        }
      }

      // Only include if we found a reasonably close match (within same day window)
      if (bestMatch && bestDiff < msPerDay) {
        alignedSourceValues.push(sourcePoint.value);
        alignedTargetValues.push(bestMatch.value);
      }
    }

    // Only compute correlation if we have enough aligned points
    if (alignedSourceValues.length >= 2) {
      const correlation = computePearsonCorrelation(
        alignedSourceValues,
        alignedTargetValues
      );

      // Track the lag with highest absolute correlation
      if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
        bestCorrelation = correlation;
        bestLag = lag;
        bestSampleSize = alignedSourceValues.length;
      }
    }
  }

  return {
    lagDays: bestLag,
    correlationStrength: bestCorrelation,
    sampleSize: bestSampleSize,
  };
}

/**
 * Finds cross-layer patterns by detecting lag correlations between consecutive layers
 * Tests pairs: 1->2, 2->3, 3->4, etc.
 * Stores results in the cross_layer_patterns table via Drizzle ORM
 */
export async function findCrossLayerPatterns(
  signals: Array<{
    layer: number;
    keyword: string;
    values: Array<{ value: number; timestamp: Date }>;
  }>
): Promise<CrossLayerCorrelation[]> {
  const results: CrossLayerCorrelation[] = [];

  // Group signals by layer
  const signalsByLayer: Record<number, Array<{ value: number; timestamp: Date }>> = {};
  let keyword = "";

  for (const signal of signals) {
    keyword = signal.keyword;
    signalsByLayer[signal.layer] = signal.values;
  }

  // Get sorted unique layers
  const layers = Object.keys(signalsByLayer)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);

  // Test consecutive layer pairs
  for (let i = 0; i < layers.length - 1; i++) {
    const sourceLayer = layers[i];
    const targetLayer = layers[i + 1];

    const sourceSignals = signalsByLayer[sourceLayer];
    const targetSignals = signalsByLayer[targetLayer];

    if (!sourceSignals || !targetSignals) {
      continue;
    }

    // Detect lag correlation
    const lagResult = detectLagCorrelation(sourceSignals, targetSignals);

    // Compute confidence based on sample size and correlation strength
    // Higher sample size and stronger correlation = higher confidence
    const baseConfidence = Math.abs(lagResult.correlationStrength);
    const sampleConfidence = Math.min(1, lagResult.sampleSize / 30); // Normalize with 30 as baseline
    const confidence = Math.sqrt(baseConfidence * sampleConfidence); // Geometric mean

    const correlation: CrossLayerCorrelation = {
      sourceLayer,
      targetLayer,
      keyword,
      lagDays: lagResult.lagDays,
      correlationStrength: lagResult.correlationStrength,
      confidence,
      sampleSize: lagResult.sampleSize,
    };

    results.push(correlation);

    // Store in database
    try {
      await db.insert(crossLayerPatterns).values({
        signalCombination: {
          sourceLayer,
          targetLayer,
          keyword,
        },
        sourceLayer,
        targetLayer,
        lagDays: lagResult.lagDays,
        correlationStrength: lagResult.correlationStrength,
        confidence,
        sampleSize: lagResult.sampleSize,
        keyword,
        status: "active",
        lastObserved: new Date(),
      });
    } catch (error) {
      console.error(
        `Error storing cross-layer pattern (${sourceLayer}->${targetLayer}):`,
        error
      );
    }
  }

  return results;
}

// ============================================================================
// Part 2: Attention Migration Index (AMI) Functions
// ============================================================================

/**
 * Computes the Attention Migration Index (AMI) composite score
 * Takes a map of layer -> latest signal scores
 * Returns AMI score with stage classification and confidence
 */
export function computeAMI(
  layerSignals: Record<number, number>
): AMIScore {
  // Extract component scores from layers
  const culturalSpikeScore = layerSignals[1] ?? 0; // Layer 1: cultural spike (attention density)
  const searchAccelerationScore = layerSignals[2] ?? 0; // Layer 2: search acceleration
  const marketplaceRankDeltaScore = layerSignals[3] ?? 0; // Layer 3: marketplace rank delta (velocity)
  const mediaAmplificationScore = layerSignals[4] ?? 0; // Layer 4: media amplification (attention density)

  // Default weights: cultural=0.2, search=0.3, marketplace=0.25, media=0.25
  const defaultWeights = {
    cultural: 0.2,
    search: 0.3,
    marketplace: 0.25,
    media: 0.25,
  };

  // Compute weighted average AMI score
  const ami =
    culturalSpikeScore * defaultWeights.cultural +
    searchAccelerationScore * defaultWeights.search +
    marketplaceRankDeltaScore * defaultWeights.marketplace +
    mediaAmplificationScore * defaultWeights.media;

  // Clamp to [0, 1]
  const clampedAmi = Math.max(0, Math.min(1, ami));

  // Stage classification
  let stage: AMIStage;

  if (
    culturalSpikeScore > 0.6 &&
    searchAccelerationScore < 0.3
  ) {
    stage = "early_noise";
  } else if (searchAccelerationScore > 0.5) {
    stage = "search_growth";
  } else if (marketplaceRankDeltaScore > 0.5) {
    stage = "buyer_interest";
  } else if (mediaAmplificationScore > 0.6) {
    stage = "media_amplification";
  } else {
    // Default to early_noise if no clear stage
    stage = "early_noise";
  }

  // Confidence based on number of layers with data
  const layersWithData = Object.values(layerSignals).filter((v) => v > 0).length;
  const confidence = Math.min(1, (layersWithData / 4) * 0.8 + 0.2); // Range [0.2, 1.0]

  return {
    ami: clampedAmi,
    stage,
    confidence,
    components: {
      culturalSpikeScore,
      searchAccelerationScore,
      marketplaceRankDeltaScore,
      mediaAmplificationScore,
    },
    layerScores: layerSignals,
  };
}

/**
 * Convenience function that queries recent external signals for a keyword
 * across all layers, computes signal scores, and returns the AMI score
 */
export async function getAMIForKeyword(keyword: string): Promise<AMIScore> {
  try {
    // Query recent external signals for this keyword across all layers
    const signals = await db
      .select()
      .from(externalSignals)
      .where(eq(externalSignals.keyword, keyword))
      .orderBy(desc(externalSignals.fetchedAt))
      .limit(100); // Get recent signals

    // Group by layer and extract the most recent signal for each layer
    const latestByLayer: Record<number, typeof signals[0]> = {};

    for (const signal of signals) {
      if (
        signal.layer !== null &&
        !(signal.layer in latestByLayer)
      ) {
        latestByLayer[signal.layer] = signal;
      }
    }

    // Extract attention density scores from normalized features
    const layerScores: Record<number, number> = {};

    for (const [layer, signal] of Object.entries(latestByLayer)) {
      const layerNum = parseInt(layer);
      if (signal.normalizedFeatures && typeof signal.normalizedFeatures === 'object') {
        const features = signal.normalizedFeatures as Record<string, unknown>;
        // Use attentionDensityScore if available, otherwise use velocity or acceleration
        const score =
          (features.attentionDensityScore as number) ??
          (features.velocity as number) ??
          (features.acceleration as number) ??
          0;
        layerScores[layerNum] = Math.max(0, Math.min(1, score)); // Normalize to [0, 1]
      }
    }

    // Compute and return AMI
    return computeAMI(layerScores);
  } catch (error) {
    console.error(`Error computing AMI for keyword "${keyword}":`, error);
    // Return default AMI score on error
    return computeAMI({});
  }
}
