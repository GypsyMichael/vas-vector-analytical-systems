// ============================================================================
// Drift Detection & Pattern Retirement Module
// ============================================================================

import { PredictionLog } from "@shared/schema";

// ============================================================================
// Pattern Retirement
// ============================================================================

export interface RetirementResult {
  patternId: string;
  retired: boolean;
  reason?: string;
  underperformanceStdDev: number;
  sampleCount: number;
}

export function checkPatternRetirement(
  patternId: string,
  predictions: PredictionLog[]
): RetirementResult {
  const result: RetirementResult = {
    patternId,
    retired: false,
    underperformanceStdDev: 0,
    sampleCount: predictions.length,
  };

  if (predictions.length < 5) {
    return result;
  }

  const actualValues = predictions
    .filter((p) => p.actualValue !== null)
    .map((p) => p.actualValue!);

  if (actualValues.length < 5) {
    return result;
  }

  const baseline = actualValues.reduce((sum, v) => sum + v, 0) / actualValues.length;

  const variance =
    actualValues.reduce((sum, v) => sum + (v - baseline) ** 2, 0) / actualValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return result;
  }

  const predictedValues = predictions.map((p) => p.predictedValue);
  const meanPredicted = predictedValues.reduce((sum, v) => sum + v, 0) / predictedValues.length;
  const meanActual = baseline;

  const underperformance = meanPredicted - meanActual;
  const underperformanceStdDev = underperformance / stdDev;

  result.underperformanceStdDev = underperformanceStdDev;

  if (Math.abs(underperformanceStdDev) > 1.5) {
    result.retired = true;
    result.reason = `Pattern underperforms baseline by ${Math.abs(underperformanceStdDev).toFixed(2)} standard deviations (threshold: 1.5)`;
  }

  return result;
}

// ============================================================================
// Drift Detection
// ============================================================================

export interface DriftStatus {
  driftDetected: boolean;
  driftType?: "overestimation" | "engagement_drop";
  severity: "none" | "mild" | "moderate" | "severe";
  recommendation: "none" | "reduce_confidence" | "retrain" | "increase_exploration";
  details: string;
}

export function detectDrift(predictions: PredictionLog[], windowSize: number = 10): DriftStatus {
  const result: DriftStatus = {
    driftDetected: false,
    severity: "none",
    recommendation: "none",
    details: "",
  };

  if (predictions.length === 0) {
    return result;
  }

  const windowPredictions = predictions.slice(-windowSize);

  // Check 1: Overestimation Detection
  const overestimationCount = windowPredictions.filter((p) => {
    if (p.actualValue === null || p.actualValue === undefined) return false;
    return p.predictedValue > p.actualValue;
  }).length;

  const validPredictions = windowPredictions.filter(
    (p) => p.actualValue !== null && p.actualValue !== undefined
  );

  if (validPredictions.length > 0) {
    const overestimationRatio = overestimationCount / validPredictions.length;

    if (overestimationRatio > 0.8) {
      result.driftDetected = true;
      result.driftType = "overestimation";
      result.severity = "severe";
      result.recommendation = "retrain";
      result.details = `${(overestimationRatio * 100).toFixed(1)}% overestimation rate detected (>80%). Model requires retraining.`;
      return result;
    }

    if (overestimationRatio > 0.6) {
      result.driftDetected = true;
      result.driftType = "overestimation";
      result.severity = "moderate";
      result.recommendation = "reduce_confidence";
      result.details = `${(overestimationRatio * 100).toFixed(1)}% overestimation rate detected (>60%). Recommend reducing confidence.`;
      return result;
    }
  }

  // Check 2: Engagement Drop Detection
  const actualValues = validPredictions.map((p) => p.actualValue!);

  if (actualValues.length >= 5) {
    const recentValues = actualValues.slice(-5);
    const historicalValues = actualValues.slice(0, -5);

    if (historicalValues.length >= 2) {
      const historicalMean =
        historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
      const historicalVariance =
        historicalValues.reduce((sum, v) => sum + (v - historicalMean) ** 2, 0) /
        historicalValues.length;
      const historicalStdDev = Math.sqrt(historicalVariance);

      if (historicalStdDev > 0) {
        const recentMean = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
        const deviations = (historicalMean - recentMean) / historicalStdDev;

        if (deviations > 2) {
          result.driftDetected = true;
          result.driftType = "engagement_drop";
          result.severity = deviations > 3 ? "severe" : "moderate";
          result.recommendation = "increase_exploration";
          result.details = `Engagement dropped ${deviations.toFixed(2)} standard deviations. Recommend increasing exploration weight.`;
          return result;
        }
      }
    }
  }

  result.details = "No significant drift detected in recent predictions.";
  return result;
}

// ============================================================================
// Trend Analysis
// ============================================================================

export interface TrendSignalData {
  signalType: string;
  metricName: string;
  value: number;
  rollingMean: number;
  zScore: number;
  acceleration: number;
  isAnomaly: boolean;
}

export function analyzeTrend(
  dataPoints: Array<{ value: number; timestamp: Date }>,
  windowSize: number = 10
): TrendSignalData {
  const result: TrendSignalData = {
    signalType: "trend",
    metricName: "metric",
    value: 0,
    rollingMean: 0,
    zScore: 0,
    acceleration: 0,
    isAnomaly: false,
  };

  if (dataPoints.length === 0) {
    return result;
  }

  const values = dataPoints.map((p) => p.value);
  result.value = values[values.length - 1];

  // Calculate rolling mean
  const rollingWindow = values.slice(Math.max(0, values.length - windowSize));
  const rollingMean = rollingWindow.reduce((sum, v) => sum + v, 0) / rollingWindow.length;
  result.rollingMean = rollingMean;

  // Calculate standard deviation
  const variance =
    rollingWindow.reduce((sum, v) => sum + (v - rollingMean) ** 2, 0) / rollingWindow.length;
  const stdDev = Math.sqrt(variance);

  // Calculate z-score
  result.zScore = stdDev > 0 ? (result.value - rollingMean) / stdDev : 0;
  result.isAnomaly = Math.abs(result.zScore) > 2;

  // Calculate velocity (first derivative) and acceleration (second derivative)
  if (values.length >= 2) {
    const timestamps = dataPoints.map((p) => p.timestamp.getTime());

    // Velocity: change in value per unit time
    const timeDiff = (timestamps[values.length - 1] - timestamps[values.length - 2]) / (1000 * 60 * 60); // hours
    const valueDiff = values[values.length - 1] - values[values.length - 2];
    const velocity = timeDiff > 0 ? valueDiff / timeDiff : 0;

    // Acceleration: change in velocity
    if (values.length >= 3) {
      const prevTimeDiff =
        (timestamps[values.length - 2] - timestamps[values.length - 3]) / (1000 * 60 * 60);
      const prevValueDiff = values[values.length - 2] - values[values.length - 3];
      const prevVelocity = prevTimeDiff > 0 ? prevValueDiff / prevTimeDiff : 0;

      const timeGapAccel = (timestamps[values.length - 1] - timestamps[values.length - 3]) / (1000 * 60 * 60);
      result.acceleration = timeGapAccel > 0 ? (velocity - prevVelocity) / timeGapAccel : 0;
    }
  }

  return result;
}

// ============================================================================
// View & Engagement Velocity
// ============================================================================

export function computeViewVelocity(views: number[], timestamps: Date[]): number {
  if (views.length < 2 || timestamps.length < 2) {
    return 0;
  }

  const sortedData = views
    .map((v, i) => ({ value: v, timestamp: timestamps[i] }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const firstTimestamp = sortedData[0].timestamp.getTime();
  const now = new Date().getTime();
  const hoursElapsed = Math.max(0, (now - firstTimestamp) / (1000 * 60 * 60));

  // For first 48 hours, calculate views per hour
  const limit48h = new Date(firstTimestamp + 48 * 60 * 60 * 1000);
  const dataIn48h = sortedData.filter((d) => d.timestamp <= limit48h);

  if (dataIn48h.length === 0) {
    return 0;
  }

  const totalViews = dataIn48h[dataIn48h.length - 1].value - (dataIn48h[0]?.value ?? 0);
  const timespan = Math.max(1, (dataIn48h[dataIn48h.length - 1].timestamp.getTime() - dataIn48h[0].timestamp.getTime()) / (1000 * 60 * 60));

  return totalViews / timespan;
}

export function computeEngagementVelocity(
  engagements: number[],
  timestamps: Date[]
): number {
  if (engagements.length < 2 || timestamps.length < 2) {
    return 0;
  }

  const sortedData = engagements
    .map((e, i) => ({ value: e, timestamp: timestamps[i] }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (sortedData.length < 2) {
    return 0;
  }

  const first = sortedData[0].value;
  const last = sortedData[sortedData.length - 1].value;
  const timeDiffHours =
    (sortedData[sortedData.length - 1].timestamp.getTime() - sortedData[0].timestamp.getTime()) /
    (1000 * 60 * 60);

  if (timeDiffHours <= 0) {
    return 0;
  }

  const engagementChange = last - first;
  return engagementChange / timeDiffHours;
}

export function computeRetentionWeightedEngagement(
  engagement: number,
  retention: number
): number {
  return engagement * retention;
}
