import crypto from "crypto";
import { db } from "../db";
import { modelSnapshots, predictionLogs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { predict, classifyTier } from "./model-training";

export async function createPredictionSnapshot(
  datasetId: string,
  modelId: string,
  featureVector: number[],
  coefficients: number[],
  predictedValue: number,
  predictedTier: string,
  confidence: number,
  sourceId?: string,
  sourceType?: string
) {
  const timestamp = new Date().toISOString();
  const hashSignature = crypto
    .createHash("sha256")
    .update(JSON.stringify({ featureVector, coefficients, predictedValue, timestamp }))
    .digest("hex");

  const [snapshot] = await db
    .insert(modelSnapshots)
    .values({
      datasetId,
      modelId,
      featureVector,
      coefficientsUsed: coefficients,
      predictedValue,
      predictedTier,
      confidence,
      hashSignature,
      isLocked: true,
      sourceId: sourceId || null,
      sourceType: sourceType || null,
    })
    .returning();

  return snapshot;
}

export async function confirmUpload(snapshotId: string) {
  const [updated] = await db
    .update(modelSnapshots)
    .set({
      uploadConfirmed: true,
      uploadConfirmedAt: new Date(),
      performanceTrackingStarted: true,
    })
    .where(eq(modelSnapshots.id, snapshotId))
    .returning();

  return updated;
}

export async function validatePrediction(snapshotId: string, actualValue: number) {
  const [snapshot] = await db
    .select()
    .from(modelSnapshots)
    .where(eq(modelSnapshots.id, snapshotId))
    .limit(1);

  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  const predicted = snapshot.predictedValue;
  const error = predicted - actualValue;
  const absoluteError = Math.abs(error);
  const directionallyCorrect = (predicted >= 0.5 && actualValue >= 0.5) || (predicted < 0.5 && actualValue < 0.5);
  const actualTier = classifyTier(actualValue);
  const tierCorrect = (snapshot.predictedTier || classifyTier(predicted)) === actualTier;

  const [log] = await db
    .insert(predictionLogs)
    .values({
      snapshotId,
      datasetId: snapshot.datasetId,
      modelId: snapshot.modelId || "",
      predictedValue: predicted,
      predictedTier: snapshot.predictedTier,
      actualValue,
      actualTier,
      error,
      absoluteError,
      directionallyCorrect,
      tierCorrect,
      validatedAt: new Date(),
    })
    .returning();

  return {
    log,
    predicted,
    actualValue,
    error,
    absoluteError,
    directionallyCorrect,
    tierCorrect,
    actualTier,
  };
}

export async function getRollingAccuracy(datasetId: string, windowSize: number = 20) {
  const logs = await db
    .select()
    .from(predictionLogs)
    .where(eq(predictionLogs.datasetId, datasetId))
    .orderBy(desc(predictionLogs.createdAt))
    .limit(windowSize);

  if (logs.length === 0) {
    return {
      directionalAccuracy: 0,
      tierAccuracy: 0,
      meanAbsoluteError: 0,
      sampleCount: 0,
    };
  }

  const validatedLogs = logs.filter((l) => l.actualValue !== null);
  if (validatedLogs.length === 0) {
    return {
      directionalAccuracy: 0,
      tierAccuracy: 0,
      meanAbsoluteError: 0,
      sampleCount: 0,
    };
  }

  let directionalCount = 0;
  let tierCount = 0;
  let totalAbsError = 0;

  for (const log of validatedLogs) {
    if (log.directionallyCorrect) directionalCount++;
    if (log.tierCorrect) tierCount++;
    totalAbsError += log.absoluteError ?? 0;
  }

  return {
    directionalAccuracy: directionalCount / validatedLogs.length,
    tierAccuracy: tierCount / validatedLogs.length,
    meanAbsoluteError: totalAbsError / validatedLogs.length,
    sampleCount: validatedLogs.length,
  };
}
