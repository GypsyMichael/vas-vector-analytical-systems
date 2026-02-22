import { predict } from "./model-training";

export interface OptimizationSuggestion {
  featureName: string;
  currentValue: number;
  suggestedValue: number;
  delta: number;
  predictedGain: number;
  confidence: number;
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestion[];
  currentPrediction: number;
  optimizedPrediction: number;
  totalProjectedLift: number;
  liftPercent: number;
}

export function simulateDelta(
  featureVector: Record<string, number>,
  featureIndex: number,
  delta: number,
  coefficients: number[],
  intercept: number
): number {
  const clonedVector = { ...featureVector };
  const featureNames = Object.keys(featureVector);
  const featureName = featureNames[featureIndex];

  if (featureName === undefined) {
    throw new Error(`Invalid feature index: ${featureIndex}`);
  }

  clonedVector[featureName] += delta;
  clonedVector[featureName] = Math.max(0, Math.min(1, clonedVector[featureName]));

  const featureArray = featureNames.map((name) => clonedVector[name] ?? 0);
  return predict(coefficients, intercept, featureArray);
}

export function optimizeFeatures(
  currentFeatures: Record<string, number>,
  coefficients: number[],
  intercept: number,
  featureNames: string[],
  stepSize: number = 0.05
): OptimizationResult {
  const currentPrediction = predict(
    coefficients,
    intercept,
    featureNames.map((name) => currentFeatures[name] ?? 0)
  );

  const suggestions: OptimizationSuggestion[] = [];

  const featureArray = featureNames.map((name) => currentFeatures[name] ?? 0);

  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i];
    const currentValue = currentFeatures[featureName] ?? 0;

    const positiveDeltaPrediction = simulateDelta(
      currentFeatures,
      i,
      stepSize,
      coefficients,
      intercept
    );
    const negativeDeltaPrediction = simulateDelta(
      currentFeatures,
      i,
      -stepSize,
      coefficients,
      intercept
    );

    const positiveGain = positiveDeltaPrediction - currentPrediction;
    const negativeGain = negativeDeltaPrediction - currentPrediction;

    let suggestedValue = currentValue;
    let predictedGain = 0;

    if (positiveGain > negativeGain && positiveGain > 0) {
      suggestedValue = Math.max(0, Math.min(1, currentValue + stepSize));
      predictedGain = positiveGain;
    } else if (negativeGain > 0) {
      suggestedValue = Math.max(0, Math.min(1, currentValue - stepSize));
      predictedGain = negativeGain;
    }

    if (predictedGain > 0) {
      const coefficient = coefficients[i] ?? 0;
      const maxCoefficient = Math.max(...coefficients.map(Math.abs));
      const confidence =
        maxCoefficient !== 0 ? Math.min(1, Math.abs(coefficient) / maxCoefficient) : 0;

      suggestions.push({
        featureName,
        currentValue,
        suggestedValue,
        delta: suggestedValue - currentValue,
        predictedGain,
        confidence,
      });
    }
  }

  suggestions.sort((a, b) => b.predictedGain - a.predictedGain);

  const totalProjectedLift = suggestions.reduce((sum, s) => sum + s.predictedGain, 0);
  const optimizedPrediction = currentPrediction + totalProjectedLift;
  const liftPercent = currentPrediction !== 0 ? (totalProjectedLift / currentPrediction) * 100 : 0;

  return {
    suggestions,
    currentPrediction,
    optimizedPrediction,
    totalProjectedLift,
    liftPercent,
  };
}

export function generateOptimizationReport(result: OptimizationResult): string {
  if (result.suggestions.length === 0) {
    return (
      `No optimization suggestions found.\n` +
      `Current prediction: ${result.currentPrediction.toFixed(4)}`
    );
  }

  let report = `Optimization Suggestions (${result.suggestions.length} features):\n`;
  report += `Current prediction: ${result.currentPrediction.toFixed(4)}\n`;
  report += `Optimized prediction: ${result.optimizedPrediction.toFixed(4)}\n`;
  report += `Total projected lift: ${result.liftPercent.toFixed(2)}%\n\n`;

  for (const suggestion of result.suggestions) {
    const deltaFormatted = suggestion.delta > 0 ? `+${suggestion.delta.toFixed(2)}` : suggestion.delta.toFixed(2);
    const gainPercent = (suggestion.predictedGain * 100).toFixed(2);
    const confidencePercent = (suggestion.confidence * 100).toFixed(0);

    report +=
      `${suggestion.featureName}: change from ${suggestion.currentValue.toFixed(2)} ` +
      `to ${suggestion.suggestedValue.toFixed(2)} (${deltaFormatted}) ` +
      `-> +${gainPercent}% lift (confidence: ${confidencePercent}%)\n`;
  }

  return report;
}
