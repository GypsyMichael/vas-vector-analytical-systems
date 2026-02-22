/**
 * Exploration vs Exploitation Engine
 *
 * Implements epsilon-greedy exploration strategy with AMI-driven epsilon adjustment.
 * Used to balance between exploiting known-good features and exploring new feature combinations.
 */

export interface ExplorationConfig {
  epsilon: number;
  mutationBounds: Record<string, { min: number; max: number; step: number }>;
}

export interface ExplorationDecision {
  groupType: "exploitation" | "exploration";
  epsilon: number;
  features: Record<string, number>;
  mutationParameters?: Record<string, number>;
  originalFeatures?: Record<string, number>;
}

export interface MutationResult {
  features: Record<string, number>;
  mutationLog: Record<string, { original: number; mutated: number; delta: number }>;
}

/**
 * Get default mutation bounds for video features
 */
export function getDefaultMutationBounds(): Record<string, { min: number; max: number; step: number }> {
  return {
    setupDuration: { min: 0, max: 1, step: 0.15 },
    punchlineTiming: { min: 0, max: 1, step: 0.15 },
    toneShiftDensity: { min: 0, max: 1, step: 0.2 },
    escalationDensity: { min: 0, max: 1, step: 0.2 },
    deliveryPaceWps: { min: 0, max: 1, step: 0.1 },
  };
}

/**
 * Adjust epsilon based on AMI stage
 *
 * - AMI rising (search_growth, buyer_interest): decrease epsilon by 30% to exploit advantage
 * - AMI uncertain (early_noise): increase epsilon by 20% to explore more
 * - AMI saturated (media_amplification): increase epsilon by 50% and increase mutation weight
 */
export function adjustEpsilon(baseEpsilon: number, amiStage?: string): number {
  if (!amiStage) {
    return baseEpsilon;
  }

  switch (amiStage) {
    case "search_growth":
    case "buyer_interest":
      return baseEpsilon * 0.7;
    case "early_noise":
      return baseEpsilon * 1.2;
    case "media_amplification":
      return baseEpsilon * 1.5;
    default:
      return baseEpsilon;
  }
}

/**
 * Mutate features within specified bounds
 *
 * For each feature in bounds, apply random mutation within the step size.
 * Returns mutated features and a mutation log tracking changes.
 */
export function mutateFeatures(
  features: Record<string, number>,
  bounds: Record<string, { min: number; max: number; step: number }>
): MutationResult {
  const mutated: Record<string, number> = { ...features };
  const mutationLog: Record<string, { original: number; mutated: number; delta: number }> = {};

  for (const [featureName, bound] of Object.entries(bounds)) {
    const originalValue = features[featureName] ?? bound.min;
    const { min, max, step } = bound;

    const numSteps = Math.floor((max - min) / step);
    const randomSteps = Math.floor(Math.random() * (2 * numSteps + 1)) - numSteps;

    let newValue = originalValue + randomSteps * step;
    newValue = Math.max(min, Math.min(max, newValue));

    mutated[featureName] = newValue;
    mutationLog[featureName] = {
      original: originalValue,
      mutated: newValue,
      delta: newValue - originalValue,
    };
  }

  return { features: mutated, mutationLog };
}

/**
 * Decide between exploration and exploitation using epsilon-greedy strategy
 *
 * Uses epsilon-greedy algorithm:
 * - Generate random number between 0 and 1
 * - If < epsilon: explore (mutate features)
 * - If >= epsilon: exploit (return features unchanged)
 *
 * If AMI stage is provided, epsilon is adjusted based on market conditions.
 */
export function decideExplorationStrategy(
  features: Record<string, number>,
  config?: ExplorationConfig,
  amiScore?: { stage?: string }
): ExplorationDecision {
  const mutationBounds = config?.mutationBounds ?? getDefaultMutationBounds();
  let baseEpsilon = config?.epsilon ?? 0.15;
  const adjustedEpsilon = adjustEpsilon(baseEpsilon, amiScore?.stage);

  const random = Math.random();
  const shouldExplore = random < adjustedEpsilon;

  if (!shouldExplore) {
    return {
      groupType: "exploitation",
      epsilon: adjustedEpsilon,
      features: { ...features },
    };
  }

  const { features: mutatedFeatures, mutationLog } = mutateFeatures(features, mutationBounds);

  return {
    groupType: "exploration",
    epsilon: adjustedEpsilon,
    features: mutatedFeatures,
    mutationParameters: Object.fromEntries(
      Object.entries(mutationLog).map(([key, value]) => [key, value.delta])
    ),
    originalFeatures: { ...features },
  };
}
