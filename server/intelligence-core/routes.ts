import type { Express, Request, Response } from "express";
import { db } from "../db";
import { datasets, datasetRecords, engineeredFeatures, patternModels, predictionLogs, trendSignals, modelSnapshots, experimentGroups } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { trainModel, predict, classifyTier } from "./model-training";
import { getDatasetType, normalizeFeatures, computeFeatureStats, extractFeaturesForRecord } from "./feature-engineering";
import { createPredictionSnapshot, confirmUpload, validatePrediction, getRollingAccuracy } from "./prediction";

const JWT_SECRET = process.env.SESSION_SECRET || "vectoras-jwt-secret";

const OPEN_ACCESS_MODE = false;

function requireAuth(req: Request, res: Response, next: any) {
  if (OPEN_ACCESS_MODE) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
        (req as any).userId = decoded.userId;
        (req as any).isAdmin = decoded.isAdmin;
        return next();
      } catch {}
    }
    (req as any).userId = "open-access-user";
    (req as any).isAdmin = true;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
    (req as any).userId = decoded.userId;
    (req as any).isAdmin = decoded.isAdmin;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function registerIntelligenceRoutes(app: Express) {
  import("./signal-sources").then(({ registerAllSignalSources }) => {
    registerAllSignalSources();
    console.log("[Intelligence Core] Signal sources registered");
  }).catch((err) => {
    console.error("[Intelligence Core] Failed to register signal sources:", err.message);
  });

  app.get("/api/intelligence/datasets", requireAuth, async (req: Request, res: Response) => {
    try {
      const allDatasets = await db.select().from(datasets).orderBy(desc(datasets.createdAt));
      res.json({ datasets: allDatasets });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list datasets", details: error.message });
    }
  });

  app.post("/api/intelligence/datasets", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, datasetType, description, targetMetricName } = req.body;
      if (!name || !datasetType) {
        return res.status(400).json({ error: "name and datasetType are required" });
      }
      const [dataset] = await db
        .insert(datasets)
        .values({ name, datasetType, description: description || null, targetMetricName: targetMetricName || null })
        .returning();
      res.status(201).json({ dataset });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create dataset", details: error.message });
    }
  });

  app.get("/api/intelligence/datasets/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const [dataset] = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      const records = await db
        .select()
        .from(datasetRecords)
        .where(eq(datasetRecords.datasetId, datasetId));
      res.json({ dataset, recordCount: records.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get dataset", details: error.message });
    }
  });

  app.post("/api/intelligence/train/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const [dataset] = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }

      const records = await db
        .select()
        .from(datasetRecords)
        .where(eq(datasetRecords.datasetId, datasetId));

      const activeRecords = records.filter((r) => r.isActive);
      if (activeRecords.length < 10) {
        return res.status(400).json({ error: "Insufficient data", recordCount: activeRecords.length, required: 10 });
      }

      const trainingRecords = activeRecords.map((r) => ({
        normalizedFeatures: (r.normalizedFeatures as Record<string, number>) || {},
        targetValue: r.targetValue ?? 0,
        createdAt: r.createdAt,
      }));

      const result = trainModel(datasetId, trainingRecords);

      const [model] = await db
        .insert(patternModels)
        .values({
          datasetId,
          modelType: "multivariate_regression",
          coefficients: result.coefficients,
          intercept: result.intercept,
          featureNames: result.featureNames,
          rSquared: result.rSquared,
          mae: result.mae,
          tierAccuracy: result.tierAccuracy,
          directionalAccuracy: result.directionalAccuracy,
          trainSampleCount: result.trainSampleCount,
          testSampleCount: result.testSampleCount,
          trainingMetrics: {
            rSquared: result.rSquared,
            mae: result.mae,
            tierAccuracy: result.tierAccuracy,
            directionalAccuracy: result.directionalAccuracy,
          },
          status: "active",
        })
        .returning();

      await db
        .update(datasets)
        .set({ lastTrainedAt: new Date() })
        .where(eq(datasets.id, datasetId));

      res.json({ model, metrics: result });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to train model", details: error.message });
    }
  });

  app.post("/api/intelligence/predict/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const { features } = req.body;
      if (!features) {
        return res.status(400).json({ error: "features are required in request body" });
      }

      const [latestModel] = await db
        .select()
        .from(patternModels)
        .where(eq(patternModels.datasetId, datasetId))
        .orderBy(desc(patternModels.createdAt))
        .limit(1);

      if (!latestModel) {
        return res.status(404).json({ error: "No trained model found for this dataset" });
      }

      const featureNames = (latestModel.featureNames as string[]) || [];
      const coefficients = (latestModel.coefficients as number[]) || [];
      const intercept = latestModel.intercept ?? 0;

      const allRecords = await db
        .select()
        .from(datasetRecords)
        .where(eq(datasetRecords.datasetId, datasetId));

      const featureArrays: Record<string, number[]> = {};
      for (const name of featureNames) {
        featureArrays[name] = [];
      }
      for (const record of allRecords) {
        const nf = record.normalizedFeatures as Record<string, number> | null;
        if (nf) {
          for (const name of featureNames) {
            if (nf[name] !== undefined) {
              featureArrays[name].push(nf[name]);
            }
          }
        }
      }

      const stats = computeFeatureStats(featureArrays);
      const normalizedFeatures = normalizeFeatures(features, stats);
      const featureVector = featureNames.map((name) => normalizedFeatures[name] ?? 0);

      const predictedValue = predict(coefficients, intercept, featureVector);
      const predictedTier = classifyTier(predictedValue);
      const confidence = latestModel.rSquared ?? 0;

      const snapshot = await createPredictionSnapshot(
        datasetId,
        latestModel.id,
        featureVector,
        coefficients,
        predictedValue,
        predictedTier,
        confidence
      );

      res.json({
        predictedValue,
        predictedTier,
        confidence,
        snapshotId: snapshot.id,
        featureVector,
        normalizedFeatures,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate prediction", details: error.message });
    }
  });

  app.post("/api/intelligence/confirm-upload/:snapshotId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const updated = await confirmUpload(snapshotId);
      if (!updated) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json({ snapshot: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to confirm upload", details: error.message });
    }
  });

  app.post("/api/intelligence/validate/:snapshotId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const { actualValue } = req.body;
      if (actualValue === undefined || actualValue === null) {
        return res.status(400).json({ error: "actualValue is required" });
      }
      const result = await validatePrediction(snapshotId, Number(actualValue));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to validate prediction", details: error.message });
    }
  });

  app.get("/api/intelligence/metrics/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const rolling = await getRollingAccuracy(datasetId);

      const [latestModel] = await db
        .select()
        .from(patternModels)
        .where(eq(patternModels.datasetId, datasetId))
        .orderBy(desc(patternModels.createdAt))
        .limit(1);

      res.json({
        rolling,
        model: latestModel || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get metrics", details: error.message });
    }
  });

  app.get("/api/intelligence/signals/sources", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getAllSignalSources } = await import("./signal-ingestion");
      const sources = getAllSignalSources();
      res.json({ sources });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list signal sources", details: error.message });
    }
  });

  app.post("/api/intelligence/signals/fetch", requireAuth, async (req: Request, res: Response) => {
    try {
      const { keyword, sourceName } = req.body;
      if (!keyword) return res.status(400).json({ error: "keyword is required" });
      const { fetchSignal, fetchAllSignals } = await import("./signal-ingestion");
      if (sourceName) {
        const result = await fetchSignal(sourceName, keyword);
        res.json({ signal: result });
      } else {
        const results = await fetchAllSignals(keyword);
        res.json({ signals: results });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch signals", details: error.message });
    }
  });

  app.get("/api/intelligence/signals/history/:sourceName", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sourceName } = req.params;
      const keyword = req.query.keyword as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const { getSignalHistory } = await import("./signal-ingestion");
      const history = await getSignalHistory(sourceName, keyword || "", limit);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get signal history", details: error.message });
    }
  });

  app.get("/api/intelligence/ami/:keyword", requireAuth, async (req: Request, res: Response) => {
    try {
      const { keyword } = req.params;
      const { getAMIForKeyword } = await import("./correlation-engine");
      const ami = await getAMIForKeyword(keyword);
      res.json(ami);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to compute AMI", details: error.message });
    }
  });

  app.post("/api/intelligence/correlations/detect", requireAuth, async (req: Request, res: Response) => {
    try {
      const { keyword } = req.body;
      if (!keyword) return res.status(400).json({ error: "keyword is required" });
      const { getSignalHistory } = await import("./signal-ingestion");
      const { findCrossLayerPatterns } = await import("./correlation-engine");
      const layers = [1, 2, 3, 4, 5, 6];
      const signals = [];
      for (const layer of layers) {
        const history = await getSignalHistory("", keyword, 100);
        const layerData = history.filter((h: any) => h.layer === layer);
        if (layerData.length > 0) {
          signals.push({
            layer,
            keyword,
            values: layerData.map((d: any) => ({
              value: (d.normalizedFeatures as any)?.attentionDensityScore || 0,
              timestamp: d.fetchedAt || d.createdAt,
            })),
          });
        }
      }
      const patterns = await findCrossLayerPatterns(signals);
      res.json({ patterns });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to detect correlations", details: error.message });
    }
  });

  app.get("/api/intelligence/optimization/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const features = req.query.features ? JSON.parse(req.query.features as string) : null;
      if (!features) return res.status(400).json({ error: "features query param required (JSON)" });

      const [latestModel] = await db
        .select()
        .from(patternModels)
        .where(eq(patternModels.datasetId, datasetId))
        .orderBy(desc(patternModels.createdAt))
        .limit(1);

      if (!latestModel) return res.status(404).json({ error: "No model found" });

      const { optimizeFeatures } = await import("./optimization");
      const featureNames = (latestModel.featureNames as string[]) || [];
      const coefficients = (latestModel.coefficients as number[]) || [];
      const intercept = latestModel.intercept ?? 0;
      const result = optimizeFeatures(features, coefficients, intercept, featureNames);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to optimize", details: error.message });
    }
  });

  app.get("/api/intelligence/drift/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const predictions = await db
        .select()
        .from(predictionLogs)
        .where(eq(predictionLogs.datasetId, datasetId))
        .orderBy(desc(predictionLogs.createdAt))
        .limit(20);

      const { detectDrift } = await import("./drift-detection");
      const mapped = predictions.map(p => ({
        predictedValue: p.predictedValue,
        actualValue: p.actualValue ?? undefined,
        error: p.error ?? undefined,
      }));
      const drift = detectDrift(mapped);
      res.json(drift);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to detect drift", details: error.message });
    }
  });

  app.get("/api/intelligence/exploration/:datasetId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { datasetId } = req.params;
      const features = req.query.features ? JSON.parse(req.query.features as string) : {};
      const { decideExplorationStrategy } = await import("./exploration");
      const { getAMIForKeyword } = await import("./correlation-engine");
      const keyword = (req.query.keyword as string) || "";
      let amiScore;
      if (keyword) {
        try { amiScore = await getAMIForKeyword(keyword); } catch {}
      }
      const decision = decideExplorationStrategy(features, undefined, amiScore);
      res.json(decision);
    } catch (error: any) {
      res.status(500).json({ error: "Failed exploration decision", details: error.message });
    }
  });
}
