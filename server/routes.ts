import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import type { User } from "@shared/schema";
import { patternModels, humorBenchmarks } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, or } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "placeholder" });

const JWT_SECRET = process.env.SESSION_SECRET || "vectoras-jwt-secret";
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";
const ASSETS_DIR = path.join(process.cwd(), "temp_ad_assets");

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const LOCKED_CTA = "Don't be the butt of the joke. List your services on Outpost Exchange for free and don't pay a dime till the contract is signed.";

const HUMOR_CATEGORIES = [
  { id: "girlfriend_expensive", name: "Girlfriend Expensive", visualTemplate: "Split-screen comparison of expectations vs reality", directive: "Comedy about the cost of dating and relationships" },
  { id: "wife_expensive", name: "Wife Expensive", visualTemplate: "Before/after marriage spending montage", directive: "Humor around married life expenses and compromises" },
  { id: "kids_expensive", name: "Kids Expensive", visualTemplate: "Escalating cost counter overlay", directive: "Comedy about the never-ending costs of raising children" },
  { id: "walletus_maximus", name: "Walletus Maximus", visualTemplate: "Wallet getting progressively thinner animation", directive: "Over-the-top dramatic portrayal of wallet destruction" },
  { id: "bluechew_wallet", name: "BlueChew Wallet", visualTemplate: "Pharmacy receipt that keeps growing", directive: "Comedy about health and wellness spending habits" },
  { id: "buddy_got_raise", name: "Buddy Got a Raise", visualTemplate: "Lifestyle inflation timeline", directive: "Humor about how raises disappear into lifestyle upgrades" },
  { id: "broke_boys", name: "Broke Boys", visualTemplate: "Creative money-saving hack montage", directive: "Comedy about creative ways to be frugal" },
  { id: "bar_stool_economics", name: "Bar Stool Economics", visualTemplate: "Bar scene with economic theory overlays", directive: "Casual economic hot takes delivered in bar setting" },
  { id: "chrome_addiction", name: "Chrome Addiction", visualTemplate: "Browser tab explosion sequence", directive: "Comedy about excessive browser tab hoarding and online shopping" },
  { id: "cubicle_vs_contractor", name: "Cubicle vs Contractor", visualTemplate: "Side-by-side day-in-the-life comparison", directive: "Humor comparing office work to contractor/freelance life" },
];

const COMPARISON_IRRITANTS = [
  { id: "price_gouging", name: "Price Gouging Pain", template: "Compare outrageous markup vs fair pricing", category: "pricing" },
  { id: "hidden_fees", name: "Hidden Fee Fury", template: "Reveal hidden costs that pile up unexpectedly", category: "pricing" },
  { id: "bad_customer_service", name: "Customer Service Nightmare", template: "Contrast terrible vs excellent customer support", category: "service" },
  { id: "shipping_delays", name: "Shipping Time Warp", template: "Compare promised vs actual delivery times", category: "logistics" },
  { id: "quality_bait_switch", name: "Quality Bait & Switch", template: "Show expectation vs reality of product quality", category: "quality" },
  { id: "subscription_trap", name: "Subscription Trap", template: "Highlight the difficulty of canceling subscriptions", category: "pricing" },
  { id: "fine_print_gotcha", name: "Fine Print Gotcha", template: "Dramatize ridiculous terms hidden in fine print", category: "trust" },
  { id: "wait_time_agony", name: "Wait Time Agony", template: "Compare appointment wait times across industries", category: "service" },
];

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function sanitizeUser(user: User) {
  const { password, ...rest } = user;
  return rest;
}

function generateAssetToken(scriptId: string): string {
  const expiry = Date.now() + 3600000;
  const secret = process.env.SESSION_SECRET || "ad-engine-assets";
  const hmac = crypto.createHmac("sha256", secret).update(`${scriptId}:${expiry}`).digest("hex");
  return `${expiry}-${hmac}`;
}

function verifyAssetToken(scriptId: string, token: string): boolean {
  const [expiryStr, providedHmac] = token.split("-");
  const expiry = parseInt(expiryStr);
  if (Date.now() > expiry) return false;
  const secret = process.env.SESSION_SECRET || "ad-engine-assets";
  const expectedHmac = crypto.createHmac("sha256", secret).update(`${scriptId}:${expiry}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

const OPEN_ACCESS_MODE = false;

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (OPEN_ACCESS_MODE) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await storage.getUser(decoded.userId);
        if (user && !user.isBanned) {
          req.user = user;
          return next();
        }
      } catch {}
    }
    req.user = {
      id: "open-access-user",
      username: "guest",
      email: "guest@vas.local",
      emailVerified: false,
      phone: null,
      phoneVerified: false,
      displayName: "Guest User",
      profilePhoto: null,
      bio: null,
      city: null,
      state: null,
      latitude: null,
      longitude: null,
      isAdmin: true,
      isOwner: false,
      isBanned: false,
      banReason: null,
      createdAt: new Date(),
      lastLoginAt: null,
    } as any;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Account is banned", reason: user.banReason });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (OPEN_ACCESS_MODE) {
    return requireAuth(req, res, next);
  }
  await requireAuth(req, res, () => {
    if (!req.user) return;
    if (!req.user.isAdmin && !req.user.isOwner) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, displayName } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }
      if (email) {
        const emailExists = await storage.getUserByEmail(email);
        if (emailExists) {
          return res.status(409).json({ error: "Email already registered" });
        }
      }
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        displayName: displayName || null,
      });
      const token = generateToken(user.id);
      res.status(201).json({ user: sanitizeUser(user), token });
    } catch (error: any) {
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.isBanned) {
        return res.status(403).json({ error: "Account is banned", reason: user.banReason });
      }
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      const token = generateToken(user.id);
      res.json({ user: sanitizeUser(user), token });
    } catch (error: any) {
      res.status(500).json({ error: "Login failed", details: error.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    res.json({ user: sanitizeUser(req.user!) });
  });
}

function registerAdEngineRoutes(app: Express) {
  app.get("/api/ad-engine/scenarios", requireAdmin, async (req: Request, res: Response) => {
    try {
      const shuffled = [...HUMOR_CATEGORIES].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6);

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a comedy ad scenario generator. Generate humor-based ad scenarios for short-form video content. The locked CTA is: "${LOCKED_CTA}". Return valid JSON only.`,
            },
            {
              role: "user",
              content: `Generate 6 unique ad scenarios for these humor categories: ${selected.map((c) => `${c.id}: ${c.name} - ${c.directive}`).join("; ")}. For each, return: { id: string, title: string, description: string, category: string, tags: string[], arc: string, suggestedCharacters: string[] }. Return as a JSON array.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const scenarios = parsed.scenarios || parsed;
          return res.json({ scenarios: Array.isArray(scenarios) ? scenarios : [scenarios] });
        }
      } catch {
        // fallback below
      }

      const fallbackScenarios = selected.map((cat, i) => ({
        id: `scenario_${cat.id}_${Date.now()}_${i}`,
        title: `${cat.name} Comedy Skit`,
        description: `A humor scenario based on ${cat.directive}`,
        category: cat.id,
        tags: [cat.id, "comedy", "ad"],
        arc: "setup → escalation → punchline → CTA",
        suggestedCharacters: ["Protagonist", "Side Character"],
      }));
      res.json({ scenarios: fallbackScenarios });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate scenarios", details: error.message });
    }
  });

  app.get("/api/ad-engine/comparison-scenarios", requireAdmin, async (req: Request, res: Response) => {
    try {
      const shuffled = [...COMPARISON_IRRITANTS].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6);
      const scenarios = selected.map((irritant, i) => ({
        id: `comparison_${irritant.id}_${Date.now()}_${i}`,
        title: irritant.name,
        description: irritant.template,
        category: irritant.category,
        irritantId: irritant.id,
        tags: [irritant.category, "comparison", "ad"],
        arc: "irritant → comparison → resolution → CTA",
        suggestedCharacters: ["Frustrated Consumer", "Satisfied Customer"],
      }));
      res.json({ scenarios });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate comparison scenarios", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/generate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scenarioId, format } = req.body;
      if (!scenarioId) {
        return res.status(400).json({ error: "scenarioId is required" });
      }

      const category = HUMOR_CATEGORIES.find((c) => scenarioId.includes(c.id));
      const categoryName = category?.name || "Comedy";
      const categoryDirective = category?.directive || "Create a funny ad scenario";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert comedy ad scriptwriter. Write 3-scene scripts for short-form video ads. The locked CTA is: "${LOCKED_CTA}". Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Write a 3-scene comedy ad script for the category "${categoryName}" (${categoryDirective}). Format: ${format || "portrait"}. Return JSON: { title: string, scenes: [{ sceneNumber: 1|2|3, setting: string, action: string, dialogue: string, narration: string, visualNotes: string, duration: number }], brandClose: { text: string, cta: string, duration: number }, totalDuration: number }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to generate script" });
      }
      const scriptData = JSON.parse(content);

      const adScript = await storage.createAdScript({
        userId: req.user!.id,
        scenarioId,
        scenarioTitle: scriptData.title || categoryName,
        humorCategory: category?.id || "general",
        format: format || "portrait",
        title: scriptData.title || `${categoryName} Ad`,
        scenes: scriptData.scenes || [],
        brandClose: scriptData.brandClose || { text: LOCKED_CTA, cta: LOCKED_CTA, duration: 5 },
        totalDuration: scriptData.totalDuration || 60,
        status: "draft",
      });

      let predictionSnapshot: { id: string; predictedValue: number; predictedTier: string; confidence: number } | null = null;

      try {
        const { getDatasetType, extractFeaturesForRecord } = await import("./intelligence-core/feature-engineering");
        const { predict, classifyTier } = await import("./intelligence-core/model-training");
        const { createPredictionSnapshot } = await import("./intelligence-core/prediction");
        const { decideExplorationStrategy } = await import("./intelligence-core/exploration");

        const [latestModel] = await db
          .select()
          .from(patternModels)
          .where(eq(patternModels.status, "active"))
          .orderBy(desc(patternModels.createdAt))
          .limit(1);

        if (latestModel) {
          const coefficients = (latestModel.coefficients as number[]) || [];
          const intercept = latestModel.intercept ?? 0;
          const featureNames = (latestModel.featureNames as string[]) || [];

          const extractor = getDatasetType("video_ads");
          if (extractor) {
            const rawFeatures = extractor.featureExtractor(scriptData);
            const featureVector = featureNames.map(name => rawFeatures[name] ?? 0);
            const predictedValue = predict(coefficients, intercept, featureVector);
            const predictedTier = classifyTier(predictedValue);

            const snapshot = await createPredictionSnapshot(
              latestModel.datasetId,
              latestModel.id,
              featureVector,
              coefficients,
              predictedValue,
              predictedTier,
              latestModel.rSquared ?? 0
            );

            predictionSnapshot = {
              id: snapshot.id,
              predictedValue,
              predictedTier,
              confidence: latestModel.rSquared ?? 0,
            };

            console.log("[Intelligence Core] Prediction snapshot created:", predictionSnapshot);
          }
        }
      } catch (predError) {
        console.log("[Intelligence Core] Prediction skipped:", (predError as Error).message);
      }

      res.status(201).json({ script: adScript, predictionSnapshot });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate script", details: error.message });
    }
  });

  app.put("/api/ad-engine/scripts/:scriptId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      const updated = await storage.updateAdScript(scriptId, req.body);
      res.json({ script: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update script", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/chat", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a comedy ad script editor. You have a script with these scenes: ${JSON.stringify(script.scenes)}. Brand close: ${JSON.stringify(script.brandClose)}. The locked CTA is: "${LOCKED_CTA}". Modify the script based on user feedback. Return the complete updated script as JSON: { title: string, scenes: [...], brandClose: {...}, totalDuration: number }`,
          },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to modify script" });
      }
      const updated = JSON.parse(content);
      const updatedScript = await storage.updateAdScript(scriptId, {
        title: updated.title || script.title,
        scenes: updated.scenes || script.scenes,
        brandClose: updated.brandClose || script.brandClose,
        totalDuration: updated.totalDuration || script.totalDuration,
      });
      res.json({ script: updatedScript });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to chat about script", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/regenerate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const category = HUMOR_CATEGORIES.find((c) => c.id === script.humorCategory);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert comedy ad scriptwriter. Write a completely new 3-scene script. The locked CTA is: "${LOCKED_CTA}". Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Regenerate a 3-scene comedy ad script for category "${category?.name || script.humorCategory}" (${category?.directive || "comedy ad"}). Format: ${script.format}. Return JSON: { title: string, scenes: [{ sceneNumber: 1|2|3, setting: string, action: string, dialogue: string, narration: string, visualNotes: string, duration: number }], brandClose: { text: string, cta: string, duration: number }, totalDuration: number }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to regenerate script" });
      }
      const newData = JSON.parse(content);
      const updated = await storage.updateAdScript(scriptId, {
        title: newData.title || script.title,
        scenes: newData.scenes || script.scenes,
        brandClose: newData.brandClose || script.brandClose,
        totalDuration: newData.totalDuration || script.totalDuration,
      });
      res.json({ script: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to regenerate script", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/voiceover", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const scenes = script.scenes as any[];
      const narrationText = scenes.map((s: any) => s.narration || s.dialogue || "").filter(Boolean).join(" ... ");

      if (!narrationText.trim()) {
        return res.status(400).json({ error: "No narration text found in scenes" });
      }

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: narrationText,
      });

      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      const fileName = `voiceover_${scriptId}.mp3`;
      const filePath = path.join(ASSETS_DIR, fileName);
      fs.writeFileSync(filePath, audioBuffer);

      const token = generateAssetToken(scriptId);
      const voiceoverUrl = `/api/ad-engine/audio/${scriptId}`;
      const publicUrl = `/api/ad-engine/audio/${scriptId}/public?token=${token}`;

      await storage.updateAdScript(scriptId, { voiceoverUrl });

      res.json({ voiceoverUrl, publicUrl, token });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate voiceover", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/voiceover/regenerate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const filePath = path.join(ASSETS_DIR, `voiceover_${scriptId}.mp3`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const scenes = script.scenes as any[];
      const narrationText = scenes.map((s: any) => s.narration || s.dialogue || "").filter(Boolean).join(" ... ");

      if (!narrationText.trim()) {
        return res.status(400).json({ error: "No narration text found in scenes" });
      }

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: narrationText,
      });

      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      fs.writeFileSync(filePath, audioBuffer);

      const token = generateAssetToken(scriptId);
      const voiceoverUrl = `/api/ad-engine/audio/${scriptId}`;
      const publicUrl = `/api/ad-engine/audio/${scriptId}/public?token=${token}`;

      await storage.updateAdScript(scriptId, { voiceoverUrl });

      res.json({ voiceoverUrl, publicUrl, token });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to regenerate voiceover", details: error.message });
    }
  });

  app.get("/api/ad-engine/audio/:scriptId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const filePath = path.join(ASSETS_DIR, `voiceover_${scriptId}.mp3`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Audio file not found" });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to serve audio", details: error.message });
    }
  });

  app.get("/api/ad-engine/audio/:scriptId/public", async (req: Request, res: Response) => {
    try {
      const { scriptId } = req.params;
      const token = req.query.token as string;
      if (!token || !verifyAssetToken(scriptId, token)) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      const filePath = path.join(ASSETS_DIR, `voiceover_${scriptId}.mp3`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Audio file not found" });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to serve audio", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/scenes/:sceneNumber/image", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId, sceneNumber } = req.params;
      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const scenes = script.scenes as any[];
      const scene = scenes.find((s: any) => s.sceneNumber === parseInt(sceneNumber));
      if (!scene) {
        return res.status(404).json({ error: "Scene not found" });
      }

      const isPortrait = script.format === "portrait";
      const size = isPortrait ? "1024x1536" : "1536x1024";

      const imagePrompt = `Comedy ad scene: ${scene.setting || ""}. ${scene.action || ""}. ${scene.visualNotes || ""}. Style: colorful, engaging, short-form video ad frame.`;

      const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: size as any,
      });

      const imageData = imageResponse.data?.[0];
      if (!imageData || !imageData.b64_json) {
        return res.status(500).json({ error: "AI failed to generate image" });
      }

      const imageBuffer = Buffer.from(imageData.b64_json, "base64");
      const fileName = `scene_${scriptId}_${sceneNumber}.png`;
      const filePath = path.join(ASSETS_DIR, fileName);
      fs.writeFileSync(filePath, imageBuffer);

      const token = generateAssetToken(scriptId);
      const imageUrl = `/api/ad-engine/images/${scriptId}/${sceneNumber}`;
      const publicUrl = `/api/ad-engine/images/${scriptId}/${sceneNumber}/public?token=${token}`;

      res.json({ imageUrl, publicUrl, token });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate scene image", details: error.message });
    }
  });

  app.post("/api/ad-engine/scripts/:scriptId/scenes/:sceneNumber/image/regenerate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { scriptId, sceneNumber } = req.params;
      const filePath = path.join(ASSETS_DIR, `scene_${scriptId}_${sceneNumber}.png`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const script = await storage.getAdScript(scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      const scenes = script.scenes as any[];
      const scene = scenes.find((s: any) => s.sceneNumber === parseInt(sceneNumber));
      if (!scene) {
        return res.status(404).json({ error: "Scene not found" });
      }

      const isPortrait = script.format === "portrait";
      const size = isPortrait ? "1024x1536" : "1536x1024";
      const imagePrompt = `Comedy ad scene: ${scene.setting || ""}. ${scene.action || ""}. ${scene.visualNotes || ""}. Style: colorful, engaging, short-form video ad frame.`;

      const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: size as any,
      });

      const imageData = imageResponse.data?.[0];
      if (!imageData || !imageData.b64_json) {
        return res.status(500).json({ error: "AI failed to generate image" });
      }

      const imageBuffer = Buffer.from(imageData.b64_json, "base64");
      fs.writeFileSync(filePath, imageBuffer);

      const token = generateAssetToken(scriptId);
      const imageUrl = `/api/ad-engine/images/${scriptId}/${sceneNumber}`;
      const publicUrl = `/api/ad-engine/images/${scriptId}/${sceneNumber}/public?token=${token}`;

      res.json({ imageUrl, publicUrl, token });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to regenerate scene image", details: error.message });
    }
  });

  app.get("/api/ad-engine/images/:scriptId/:sceneNumber", requireAuth, async (req: Request, res: Response) => {
    try {
      const { scriptId, sceneNumber } = req.params;
      const filePath = path.join(ASSETS_DIR, `scene_${scriptId}_${sceneNumber}.png`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Image file not found" });
      }
      res.setHeader("Content-Type", "image/png");
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to serve image", details: error.message });
    }
  });

  app.get("/api/ad-engine/images/:scriptId/:sceneNumber/public", async (req: Request, res: Response) => {
    try {
      const { scriptId, sceneNumber } = req.params;
      const token = req.query.token as string;
      if (!token || !verifyAssetToken(scriptId, token)) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      const filePath = path.join(ASSETS_DIR, `scene_${scriptId}_${sceneNumber}.png`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Image file not found" });
      }
      res.setHeader("Content-Type", "image/png");
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to serve image", details: error.message });
    }
  });

  app.get("/api/ad-engine/scripts", requireAuth, async (req: Request, res: Response) => {
    try {
      const scripts = await storage.getAdScriptsByUser(req.user!.id);
      res.json({ scripts });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list scripts", details: error.message });
    }
  });

  app.get("/api/ad-engine/scripts/:scriptId", requireAuth, async (req: Request, res: Response) => {
    try {
      const script = await storage.getAdScript(req.params.scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      res.json({ script });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get script", details: error.message });
    }
  });
}

function registerHumorScreenerRoutes(app: Express) {
  app.post("/api/humor-screener/performance", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const views = data.views || 0;
      const likes = data.likes || 0;
      const comments = data.comments || 0;
      const shares = data.shares || 0;
      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

      const record = await storage.createPerformance({
        ...data,
        engagementRate,
      });
      res.status(201).json({ performance: record });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to record performance", details: error.message });
    }
  });

  app.get("/api/humor-screener/performance", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { category, platform, sort } = req.query;
      const records = await storage.getPerformanceRecords({
        category: category as string,
        platform: platform as string,
        sort: sort as string,
      });
      res.json({ performance: records });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list performance", details: error.message });
    }
  });

  app.post("/api/humor-screener/benchmarks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const benchmark = await storage.createBenchmark(req.body);
      res.status(201).json({ benchmark });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create benchmark", details: error.message });
    }
  });

  app.get("/api/humor-screener/benchmarks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { creator, style, platform } = req.query;
      const benchmarks = await storage.getBenchmarks({
        creator: creator as string,
        style: style as string,
        platform: platform as string,
      });
      res.json({ benchmarks });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list benchmarks", details: error.message });
    }
  });

  app.get("/api/humor-screener/analytics", requireAdmin, async (req: Request, res: Response) => {
    try {
      const [allPerformance, topPerformers, topBenchmarks] = await Promise.all([
        storage.getPerformanceRecords(),
        storage.getTopPerformers(10),
        storage.getTopBenchmarks(10),
      ]);

      const categoryBreakdown: Record<string, { count: number; avgEngagement: number; totalViews: number }> = {};
      const platformBreakdown: Record<string, { count: number; avgEngagement: number; totalViews: number }> = {};

      for (const record of allPerformance) {
        if (!categoryBreakdown[record.humorCategory]) {
          categoryBreakdown[record.humorCategory] = { count: 0, avgEngagement: 0, totalViews: 0 };
        }
        categoryBreakdown[record.humorCategory].count++;
        categoryBreakdown[record.humorCategory].avgEngagement += (record.engagementRate || 0);
        categoryBreakdown[record.humorCategory].totalViews += (record.views || 0);

        if (!platformBreakdown[record.platform]) {
          platformBreakdown[record.platform] = { count: 0, avgEngagement: 0, totalViews: 0 };
        }
        platformBreakdown[record.platform].count++;
        platformBreakdown[record.platform].avgEngagement += (record.engagementRate || 0);
        platformBreakdown[record.platform].totalViews += (record.views || 0);
      }

      for (const key of Object.keys(categoryBreakdown)) {
        categoryBreakdown[key].avgEngagement /= categoryBreakdown[key].count || 1;
      }
      for (const key of Object.keys(platformBreakdown)) {
        platformBreakdown[key].avgEngagement /= platformBreakdown[key].count || 1;
      }

      let aiSuggestions = null;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a humor content analytics advisor. Provide actionable suggestions based on performance data. Return valid JSON.",
            },
            {
              role: "user",
              content: `Analyze this humor content performance data and provide suggestions: Categories: ${JSON.stringify(categoryBreakdown)}, Platforms: ${JSON.stringify(platformBreakdown)}, Top performers: ${topPerformers.length} entries. Return JSON: { suggestions: string[], topOpportunities: string[], warnings: string[] }`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        if (content) aiSuggestions = JSON.parse(content);
      } catch {
        aiSuggestions = { suggestions: ["Insufficient data for AI analysis"], topOpportunities: [], warnings: [] };
      }

      res.json({
        totalRecords: allPerformance.length,
        categoryBreakdown,
        platformBreakdown,
        topPerformers,
        topBenchmarks,
        aiSuggestions,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate analytics", details: error.message });
    }
  });

  app.post("/api/humor-screener/suggest", requireAdmin, async (req: Request, res: Response) => {
    try {
      const count = Math.min(Math.max(req.body.count || 3, 1), 10);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a comedy content strategist. Generate unique humor concept suggestions with structural blueprints for short-form video ads. The locked CTA is: "${LOCKED_CTA}". Return valid JSON.`,
          },
          {
            role: "user",
            content: `Generate ${count} unique humor concept suggestions. Available categories: ${HUMOR_CATEGORIES.map((c) => c.name).join(", ")}. For each concept return: { title: string, category: string, concept: string, blueprint: { hook: string, setup: string, escalation: string, punchline: string, cta: string }, estimatedViralPotential: string, targetPlatforms: string[] }. Return as JSON: { concepts: [...] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to generate suggestions" });
      }
      const parsed = JSON.parse(content);
      res.json({ concepts: parsed.concepts || [] });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate suggestions", details: error.message });
    }
  });
}

function registerCopyAssistantRoutes(app: Express) {
  app.post("/api/studio/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, campaignType, listingId } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Campaign name is required" });
      }
      const campaign = await storage.createCampaign({
        userId: req.user!.id,
        name,
        campaignType: campaignType || "general",
        listingId: listingId || null,
        conversationHistory: [],
      });
      res.status(201).json({ campaign });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create campaign", details: error.message });
    }
  });

  app.get("/api/studio/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaignsByUser(req.user!.id);
      res.json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list campaigns", details: error.message });
    }
  });

  app.get("/api/studio/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json({ campaign });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get campaign", details: error.message });
    }
  });

  app.put("/api/studio/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const updated = await storage.updateCampaign(req.params.id, req.body);
      res.json({ campaign: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update campaign", details: error.message });
    }
  });

  app.delete("/api/studio/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete campaign", details: error.message });
    }
  });

  app.post("/api/studio/campaigns/:campaignId/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const history = (campaign.conversationHistory as any[]) || [];
      history.push({ role: "user", content: message, timestamp: new Date().toISOString() });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a creative copy assistant helping with ad campaign "${campaign.name}" (type: ${campaign.campaignType}). Help the user develop their campaign strategy, copy, and creative direction. Current phase: ${campaign.conversationPhase || "intent_discovery"}. Be conversational and helpful.`,
          },
          ...history.map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
        ],
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'd be happy to help with your campaign.";
      history.push({ role: "assistant", content: aiResponse, timestamp: new Date().toISOString() });

      await storage.updateCampaign(campaignId, { conversationHistory: history });

      res.json({ response: aiResponse, conversationHistory: history });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to chat", details: error.message });
    }
  });

  app.get("/api/studio/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      let profile = await storage.getCreativeProfile(req.user!.id);
      if (!profile) {
        profile = await storage.createCreativeProfile({
          userId: req.user!.id,
          riskTolerance: "moderate",
          restrictionState: "normal",
          totalVideosCreated: 0,
          totalVideosPosted: 0,
        });
      }
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get profile", details: error.message });
    }
  });

  app.post("/api/studio/profile/reset", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.resetCreativeProfile(req.user!.id);
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to reset profile", details: error.message });
    }
  });

  app.get("/api/studio/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.id);
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get dashboard stats", details: error.message });
    }
  });
}

function registerEnvironmentRoutes(app: Express) {
  app.post("/api/environment/discover", requireAuth, async (req: Request, res: Response) => {
    try {
      const { url, platformName } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const humorCategoryIds = HUMOR_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(", ");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a platform analysis expert specializing in extracting actionable data for short-form humor video ad production targeting blue-collar contractor audiences. Analyze the given URL/platform and generate a comprehensive environment profile with deep video-creation-relevant insights. Do NOT actually crawl the URL - simulate realistic discovery based on the URL pattern and platform name. Return valid JSON.`,
          },
          {
            role: "user",
            content: `Analyze this platform URL: ${url}. Platform name: ${platformName || "Unknown"}.

Return JSON with ALL of these fields populated with rich, specific data:
{
  "platformName": "string",
  "platformType": "string (marketplace|service|tool|media|social|retailer|brand)",
  "industry": "string",
  "brandPersonality": "string (2-3 sentences describing their voice)",
  "toneProfile": {
    "primary": "string (dominant communication tone)",
    "secondary": "string (secondary tone)",
    "avoid": ["tones to avoid as array of strings"],
    "humorTolerance": "low|medium|high (how receptive their audience is to humor)",
    "sarcasmLevel": "none|light|medium|heavy"
  },
  "audienceProfile": {
    "demographics": "string (age, gender, income, location patterns)",
    "interests": ["array of 5-8 specific interests"],
    "painPoints": ["array of 5-8 specific frustrations and problems they face"],
    "buyingTriggers": ["array of 4-6 things that motivate them to purchase"],
    "objections": ["array of 3-5 common reasons they hesitate or don't buy"],
    "mediaHabits": "string (where they consume content, when, what format)",
    "languageStyle": "string (how they talk - slang, formality, jargon examples)"
  },
  "discoveredProducts": [
    {
      "name": "string",
      "category": "string",
      "priceRange": "string ($X-$Y)",
      "uniqueSellingPoint": "string (what makes this product stand out)",
      "comparisonTarget": "string (what competitor product this replaces)",
      "adAngle": "string (best humor angle for advertising this product)"
    }
  ],
  "suggestedAngles": ["array of 6-10 specific ad angle descriptions, each 1-2 sentences"],
  "videoCreationBrief": {
    "primaryMessage": "string (the one thing every video should communicate)",
    "targetEmotion": "string (what viewers should feel: relief, validation, amusement, etc.)",
    "callToActionContext": "string (what problem the CTA solves for this audience)",
    "visualStyle": "string (recommended visual approach for this market)",
    "pacing": "fast|medium|slow (recommended video pacing)",
    "idealLength": "string (15s|30s|60s with reasoning)",
    "doNotShow": ["array of things to avoid showing in videos for this platform"]
  },
  "competitorWeaknesses": [
    {
      "competitor": "string (competitor name or type)",
      "weakness": "string (specific exploitable weakness)",
      "adOpportunity": "string (how to turn this into a funny ad)"
    }
  ],
  "emotionalTriggers": [
    {
      "trigger": "string (specific emotional trigger)",
      "context": "string (when/why this trigger activates)",
      "humorAngle": "string (how to make this funny in an ad)"
    }
  ],
  "contentGaps": [
    {
      "gap": "string (content that's missing in this space)",
      "opportunity": "string (how to fill it with humor video content)",
      "priority": "high|medium|low"
    }
  ],
  "humorMapping": [
    {
      "categoryId": "string (one of: ${humorCategoryIds})",
      "relevanceScore": 1-10,
      "specificAngle": "string (how this humor category applies to this platform's audience)",
      "exampleSetup": "string (example joke setup for this category + platform)"
    }
  ],
  "seasonalHooks": [
    {
      "season": "string (time period or event)",
      "hook": "string (how to tie the platform/product to this season)",
      "urgency": "high|medium|low"
    }
  ]
}

Populate EVERY field with realistic, specific, actionable data. For humorMapping, include at least 5 of the 10 categories with the highest relevance. For competitorWeaknesses, include at least 3 competitors. For emotionalTriggers, include at least 4 triggers. Make all data specific to the platform and its blue-collar contractor audience.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to analyze platform" });
      }
      const analysis = JSON.parse(content);

      const profile = await storage.createEnvironmentProfile({
        platformName: analysis.platformName || platformName || "Unknown Platform",
        platformUrl: url,
        platformType: analysis.platformType || "marketplace",
        industry: analysis.industry || "general",
        brandPersonality: analysis.brandPersonality || "professional",
        toneProfile: analysis.toneProfile || null,
        audienceProfile: analysis.audienceProfile || null,
        discoveredProducts: analysis.discoveredProducts || null,
        suggestedAngles: analysis.suggestedAngles || null,
        videoCreationBrief: analysis.videoCreationBrief || null,
        competitorWeaknesses: analysis.competitorWeaknesses || null,
        emotionalTriggers: analysis.emotionalTriggers || null,
        contentGaps: analysis.contentGaps || null,
        humorMapping: analysis.humorMapping || null,
        seasonalHooks: analysis.seasonalHooks || null,
        crawlData: { analyzedAt: new Date().toISOString(), source: "ai_simulation" },
        lastCrawledAt: new Date(),
      });

      res.status(201).json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to discover environment", details: error.message });
    }
  });

  app.get("/api/environment/profiles", requireAuth, async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getEnvironmentProfiles();
      res.json({ profiles });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list profiles", details: error.message });
    }
  });

  app.get("/api/environment/profiles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getEnvironmentProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get profile", details: error.message });
    }
  });

  app.put("/api/environment/profiles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getEnvironmentProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const updated = await storage.updateEnvironmentProfile(req.params.id, req.body);
      res.json({ profile: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });

  app.post("/api/environment/profiles/:id/refresh", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getEnvironmentProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a platform analysis expert specializing in extracting actionable data for short-form humor video ad production targeting blue-collar contractor audiences. Re-analyze the platform with deeper insights for video creation. Return valid JSON.`,
          },
          {
            role: "user",
            content: `Re-analyze platform: ${profile.platformUrl || profile.platformName}. Previous industry: ${profile.industry}, type: ${profile.platformType}. Available humor categories: ${HUMOR_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(", ")}.

Return JSON with ALL fields: { platformType: string, industry: string, brandPersonality: string, toneProfile: { primary: string, secondary: string, avoid: string[], humorTolerance: string, sarcasmLevel: string }, audienceProfile: { demographics: string, interests: string[], painPoints: string[], buyingTriggers: string[], objections: string[], mediaHabits: string, languageStyle: string }, suggestedAngles: string[], discoveredProducts: [{ name: string, category: string, priceRange: string, uniqueSellingPoint: string, comparisonTarget: string, adAngle: string }], videoCreationBrief: { primaryMessage: string, targetEmotion: string, callToActionContext: string, visualStyle: string, pacing: string, idealLength: string, doNotShow: string[] }, competitorWeaknesses: [{ competitor: string, weakness: string, adOpportunity: string }], emotionalTriggers: [{ trigger: string, context: string, humorAngle: string }], contentGaps: [{ gap: string, opportunity: string, priority: string }], humorMapping: [{ categoryId: string, relevanceScore: number, specificAngle: string, exampleSetup: string }], seasonalHooks: [{ season: string, hook: string, urgency: string }] }. Populate ALL fields with specific, actionable data. Include at least 5 humor mappings, 3 competitors, and 4 emotional triggers.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to refresh analysis" });
      }
      const analysis = JSON.parse(content);

      const updated = await storage.updateEnvironmentProfile(req.params.id, {
        platformType: analysis.platformType || profile.platformType,
        industry: analysis.industry || profile.industry,
        brandPersonality: analysis.brandPersonality || profile.brandPersonality,
        toneProfile: analysis.toneProfile || profile.toneProfile,
        audienceProfile: analysis.audienceProfile || profile.audienceProfile,
        suggestedAngles: analysis.suggestedAngles || profile.suggestedAngles,
        discoveredProducts: analysis.discoveredProducts || profile.discoveredProducts,
        videoCreationBrief: analysis.videoCreationBrief || profile.videoCreationBrief,
        competitorWeaknesses: analysis.competitorWeaknesses || profile.competitorWeaknesses,
        emotionalTriggers: analysis.emotionalTriggers || profile.emotionalTriggers,
        contentGaps: analysis.contentGaps || profile.contentGaps,
        humorMapping: analysis.humorMapping || profile.humorMapping,
        seasonalHooks: analysis.seasonalHooks || profile.seasonalHooks,
        lastCrawledAt: new Date(),
        crawlData: { analyzedAt: new Date().toISOString(), source: "ai_simulation_refresh" },
      });

      res.json({ profile: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to refresh profile", details: error.message });
    }
  });

  app.get("/api/environment/profiles/:id/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const products = await storage.getProductsByEnvironment(req.params.id);
      res.json({ products });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list products", details: error.message });
    }
  });

  app.post("/api/environment/profiles/:id/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const product = await storage.createProduct({
        environmentId: req.params.id,
        ...req.body,
      });
      res.status(201).json({ product });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add product", details: error.message });
    }
  });

  app.delete("/api/environment/profiles/:id/products/:productId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteProduct(req.params.productId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete product", details: error.message });
    }
  });

  app.get("/api/environment/video-brief", requireAuth, async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getEnvironmentProfiles();
      const activeProfiles = profiles.filter((p: any) => p.isActive);

      const benchmarks = await storage.getBenchmarks({});
      const youtubeBenchmarks = benchmarks.filter((b: any) => b.platform === "youtube");

      const topPerforming = [...youtubeBenchmarks]
        .sort((a: any, b: any) => (b.engagementRate || 0) - (a.engagementRate || 0))
        .slice(0, 10);

      const analyzedBenchmarks = youtubeBenchmarks.filter((b: any) => b.whatWorked);

      const humorStyleDistribution: Record<string, number> = {};
      for (const bm of youtubeBenchmarks) {
        const style = (bm as any).humorStyle || "unknown";
        humorStyleDistribution[style] = (humorStyleDistribution[style] || 0) + 1;
      }

      const allPainPoints: string[] = [];
      const allEmotionalTriggers: any[] = [];
      const allCompetitorWeaknesses: any[] = [];
      const allContentGaps: any[] = [];
      const allHumorMappings: any[] = [];
      const allProducts: any[] = [];
      const allSeasonalHooks: any[] = [];
      const videoBriefs: any[] = [];

      for (const profile of activeProfiles) {
        const audience = profile.audienceProfile as any;
        if (audience?.painPoints) allPainPoints.push(...audience.painPoints);

        if (profile.emotionalTriggers) {
          const triggers = profile.emotionalTriggers as any[];
          allEmotionalTriggers.push(...triggers.map((t: any) => ({ ...t, source: profile.platformName })));
        }
        if (profile.competitorWeaknesses) {
          const weaknesses = profile.competitorWeaknesses as any[];
          allCompetitorWeaknesses.push(...weaknesses.map((w: any) => ({ ...w, source: profile.platformName })));
        }
        if (profile.contentGaps) {
          const gaps = profile.contentGaps as any[];
          allContentGaps.push(...gaps.map((g: any) => ({ ...g, source: profile.platformName })));
        }
        if (profile.humorMapping) {
          const mappings = profile.humorMapping as any[];
          allHumorMappings.push(...mappings.map((m: any) => ({ ...m, source: profile.platformName })));
        }
        if (profile.discoveredProducts) {
          const products = profile.discoveredProducts as any[];
          allProducts.push(...products.map((p: any) => ({ ...p, source: profile.platformName })));
        }
        if (profile.seasonalHooks) {
          const hooks = profile.seasonalHooks as any[];
          allSeasonalHooks.push(...hooks.map((h: any) => ({ ...h, source: profile.platformName })));
        }
        if (profile.videoCreationBrief) {
          videoBriefs.push({ ...(profile.videoCreationBrief as any), source: profile.platformName });
        }
      }

      const humorRankings = allHumorMappings.reduce((acc: Record<string, { totalScore: number; count: number; angles: string[] }>, m: any) => {
        if (!acc[m.categoryId]) acc[m.categoryId] = { totalScore: 0, count: 0, angles: [] };
        acc[m.categoryId].totalScore += m.relevanceScore || 0;
        acc[m.categoryId].count += 1;
        if (m.specificAngle) acc[m.categoryId].angles.push(m.specificAngle);
        return acc;
      }, {});

      const rankedHumorCategories = Object.entries(humorRankings)
        .map(([id, data]) => ({
          categoryId: id,
          avgRelevance: data.count > 0 ? data.totalScore / data.count : 0,
          angles: data.angles,
        }))
        .sort((a, b) => b.avgRelevance - a.avgRelevance);

      res.json({
        brief: {
          generatedAt: new Date().toISOString(),
          profileCount: activeProfiles.length,
          benchmarkCount: youtubeBenchmarks.length,
          analyzedCount: analyzedBenchmarks.length,
          audienceInsights: {
            painPoints: [...new Set(allPainPoints)],
            emotionalTriggers: allEmotionalTriggers,
            competitorWeaknesses: allCompetitorWeaknesses,
          },
          videoGuidance: {
            briefs: videoBriefs,
            contentGaps: allContentGaps.sort((a: any, b: any) => {
              const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
              return (p[b.priority] || 0) - (p[a.priority] || 0);
            }),
            seasonalHooks: allSeasonalHooks,
          },
          humorStrategy: {
            rankedCategories: rankedHumorCategories,
            styleDistribution: humorStyleDistribution,
            topPerformingVideos: topPerforming.map((v: any) => ({
              title: v.videoTitle,
              engagementRate: v.engagementRate,
              humorStyle: v.humorStyle,
              whatWorked: v.whatWorked,
            })),
          },
          products: allProducts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate video brief", details: error.message });
    }
  });
}

function registerKnowledgeRoutes(app: Express) {
  app.post("/api/knowledge/research", requireAuth, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const researchQuery = await storage.createResearchQuery({
        userId: req.user!.id,
        queryText: query,
        source: "user",
        researchType: "general",
        status: "processing",
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a research assistant specializing in marketing, advertising, and content strategy. Generate detailed, actionable insights based on the query. Return valid JSON.",
          },
          {
            role: "user",
            content: `Research query: "${query}". Return JSON: { insights: [{ title: string, content: string, category: string, confidence: number, tags: string[] }] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        await storage.updateResearchQuery(researchQuery.id, { status: "failed" });
        return res.status(500).json({ error: "AI failed to generate insights" });
      }
      const parsed = JSON.parse(content);
      const insights = parsed.insights || [];

      const entries = [];
      for (const insight of insights) {
        const entry = await storage.createKnowledgeEntry({
          source: "ai_research",
          category: insight.category || "general",
          title: insight.title,
          content: insight.content,
          confidence: insight.confidence || 0.7,
          tags: insight.tags || [],
        });
        entries.push(entry);
      }

      await storage.updateResearchQuery(researchQuery.id, {
        status: "completed",
        resultsFound: insights.length,
        knowledgeEntriesCreated: entries.length,
        executedAt: new Date(),
      });

      res.status(201).json({ query: researchQuery, entries });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to execute research", details: error.message });
    }
  });

  app.get("/api/knowledge/entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const { environmentId, category, source } = req.query;
      const entries = await storage.getKnowledgeEntries({
        environmentId: environmentId as string,
        category: category as string,
        source: source as string,
      });
      res.json({ entries });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list entries", details: error.message });
    }
  });

  app.get("/api/knowledge/entries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json({ entry });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get entry", details: error.message });
    }
  });

  app.put("/api/knowledge/entries/:id/pin", requireAuth, async (req: Request, res: Response) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const updated = await storage.updateKnowledgeEntry(req.params.id, { isPinned: !entry.isPinned });
      res.json({ entry: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to pin entry", details: error.message });
    }
  });

  app.delete("/api/knowledge/entries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteKnowledgeEntry(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete entry", details: error.message });
    }
  });

  app.get("/api/knowledge/queries", requireAuth, async (req: Request, res: Response) => {
    try {
      const queries = await storage.getResearchQueries(req.user!.id);
      res.json({ queries });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list queries", details: error.message });
    }
  });

  app.get("/api/knowledge/insights", requireAuth, async (req: Request, res: Response) => {
    try {
      const entries = await storage.getKnowledgeEntries();

      if (entries.length === 0) {
        return res.json({ summary: "No knowledge entries found. Start by running research queries.", insights: [] });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a knowledge synthesis expert. Summarize and find patterns across knowledge entries. Return valid JSON.",
          },
          {
            role: "user",
            content: `Summarize these ${entries.length} knowledge entries: ${JSON.stringify(entries.slice(0, 20).map((e) => ({ title: e.title, category: e.category, content: e.content.substring(0, 200) })))}. Return JSON: { summary: string, keyThemes: string[], actionableInsights: string[], gaps: string[] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.json({ summary: "Unable to generate AI insights at this time.", insights: [] });
      }
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate insights", details: error.message });
    }
  });
}

function registerContentStrategyRoutes(app: Express) {
  app.post("/api/strategy/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { environmentId } = req.body;
      if (!environmentId) {
        return res.status(400).json({ error: "environmentId is required" });
      }

      const profile = await storage.getEnvironmentProfile(environmentId);
      if (!profile) {
        return res.status(404).json({ error: "Environment profile not found" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a content strategy expert. Generate a comprehensive content strategy based on the environment profile. The locked CTA is: "${LOCKED_CTA}". Return valid JSON.`,
          },
          {
            role: "user",
            content: `Generate a content strategy for: Platform: ${profile.platformName}, Industry: ${profile.industry}, Type: ${profile.platformType}. Audience: ${JSON.stringify(profile.audienceProfile)}. Return JSON: { audienceSegments: [{ name: string, description: string, priorities: string[] }], generatedCategories: [{ name: string, description: string, frequency: string, contentTypes: string[] }], ctaTemplates: [{ template: string, useCase: string }], performanceNotes: { expectedEngagement: string, bestTimes: string[], contentMix: object } }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to generate strategy" });
      }
      const strategyData = JSON.parse(content);

      const existing = await storage.getContentStrategy(environmentId);
      let strategy;
      if (existing) {
        strategy = await storage.updateContentStrategy(existing.id, {
          audienceSegments: strategyData.audienceSegments,
          generatedCategories: strategyData.generatedCategories,
          ctaTemplates: strategyData.ctaTemplates,
          performanceNotes: strategyData.performanceNotes,
          lastGeneratedAt: new Date(),
        });
      } else {
        strategy = await storage.createContentStrategy({
          environmentId,
          audienceSegments: strategyData.audienceSegments,
          generatedCategories: strategyData.generatedCategories,
          ctaTemplates: strategyData.ctaTemplates,
          performanceNotes: strategyData.performanceNotes,
        });
      }

      res.status(201).json({ strategy });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate strategy", details: error.message });
    }
  });

  app.get("/api/strategy/:environmentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getContentStrategy(req.params.environmentId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json({ strategy });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get strategy", details: error.message });
    }
  });

  app.put("/api/strategy/:environmentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getContentStrategy(req.params.environmentId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      const updated = await storage.updateContentStrategy(strategy.id, req.body);
      res.json({ strategy: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update strategy", details: error.message });
    }
  });

  app.post("/api/strategy/:environmentId/calibrate", requireAuth, async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getContentStrategy(req.params.environmentId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }

      const performance = await storage.getPerformanceRecords();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a content strategy calibration expert. Adjust the strategy based on performance data. Return valid JSON.",
          },
          {
            role: "user",
            content: `Current strategy: ${JSON.stringify({ categories: strategy.generatedCategories, audiences: strategy.audienceSegments })}. Performance data: ${JSON.stringify(performance.slice(0, 20).map((p) => ({ category: p.humorCategory, engagement: p.engagementRate, views: p.views })))}. Return JSON with adjusted: { audienceSegments: [...], generatedCategories: [...], performanceNotes: { adjustments: string[], reasoning: string } }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "AI failed to calibrate strategy" });
      }
      const calibrated = JSON.parse(content);

      const updated = await storage.updateContentStrategy(strategy.id, {
        audienceSegments: calibrated.audienceSegments || strategy.audienceSegments,
        generatedCategories: calibrated.generatedCategories || strategy.generatedCategories,
        performanceNotes: calibrated.performanceNotes || strategy.performanceNotes,
        performanceAdjustedAt: new Date(),
      });

      res.json({ strategy: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to calibrate strategy", details: error.message });
    }
  });

  app.get("/api/strategy/:environmentId/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getContentStrategy(req.params.environmentId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json({ categories: strategy.generatedCategories || [] });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get categories", details: error.message });
    }
  });
}

let youtubeQuotaUsed = 0;
let lastYouTubeScanAt: Date | null = null;

function registerYouTubeResearchRoutes(app: Express) {
  app.get("/api/youtube-research/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const benchmarks = await storage.getBenchmarks({});
      res.json({
        apiKeyConfigured: !!process.env.YOUTUBE_API_KEY,
        lastScanAt: lastYouTubeScanAt,
        totalBenchmarks: benchmarks.length,
        quotaUsedThisSession: youtubeQuotaUsed,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get status", details: error.message });
    }
  });

  app.post("/api/youtube-research/scan", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        return res.status(400).json({ error: "YouTube API key not configured" });
      }

      const requestedCategories: string[] | undefined = req.body?.categories;
      const categoriesToScan = requestedCategories
        ? HUMOR_CATEGORIES.filter(c => requestedCategories.includes(c.id))
        : HUMOR_CATEGORIES;

      let totalSearched = 0;
      let newBenchmarks = 0;
      let duplicates = 0;
      const addedBenchmarks: any[] = [];

      for (const category of categoriesToScan) {
        try {
          const query = encodeURIComponent(`"${category.name}" comedy short`);
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoDuration=short&order=viewCount&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`;
          const searchRes = await fetch(searchUrl);
          youtubeQuotaUsed += 100;

          if (!searchRes.ok) continue;

          const searchData = await searchRes.json() as any;
          const items = searchData.items || [];
          totalSearched += items.length;

          if (items.length === 0) continue;

          const videoIds = items.map((item: any) => item.id.videoId).filter(Boolean);
          if (videoIds.length === 0) continue;

          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${process.env.YOUTUBE_API_KEY}`;
          const videosRes = await fetch(videosUrl);
          youtubeQuotaUsed += 1;

          if (!videosRes.ok) continue;

          const videosData = await videosRes.json() as any;
          const videos = videosData.items || [];

          for (const video of videos) {
            const videoId = video.id;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            const existing = await storage.getBenchmarkByUrl(videoUrl);
            if (existing) {
              duplicates++;
              continue;
            }

            const views = parseInt(video.statistics?.viewCount || "0");
            const likes = parseInt(video.statistics?.likeCount || "0");
            const comments = parseInt(video.statistics?.commentCount || "0");
            const engagementRate = views > 0 ? ((likes + comments) / views * 100) : 0;

            const benchmark = await storage.createBenchmark({
              creatorName: video.snippet?.channelTitle || "Unknown",
              creatorHandle: video.snippet?.channelId || "",
              platform: "youtube",
              humorStyle: category.id,
              videoUrl,
              videoTitle: video.snippet?.title || "",
              views,
              likes,
              comments,
              engagementRate,
              tags: [category.id, "youtube", "short"],
              scrapedAt: new Date(),
            });

            addedBenchmarks.push(benchmark);
            newBenchmarks++;
          }
        } catch {
          continue;
        }
      }

      lastYouTubeScanAt = new Date();
      res.json({ scanned: totalSearched, added: newBenchmarks, skipped: duplicates, results: addedBenchmarks });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to scan", details: error.message });
    }
  });

  app.post("/api/youtube-research/analyze-batch", requireAdmin, async (req: Request, res: Response) => {
    try {
      const requestedIds: number[] | undefined = req.body?.benchmarkIds;
      let benchmarksToAnalyze: any[];

      if (requestedIds && requestedIds.length > 0) {
        const all = await storage.getBenchmarks({});
        benchmarksToAnalyze = all.filter(b => requestedIds.includes(b.id));
      } else {
        const all = await db.select().from(humorBenchmarks).where(
          or(isNull(humorBenchmarks.whatWorked), isNull(humorBenchmarks.toneNotes))
        );
        benchmarksToAnalyze = all;
      }

      let analyzedCount = 0;
      const analyzedResults: any[] = [];

      for (let i = 0; i < benchmarksToAnalyze.length; i += 5) {
        const batch = benchmarksToAnalyze.slice(i, i + 5);

        const videosInfo = batch.map((b: any) => ({
          id: b.id,
          title: b.videoTitle || "Untitled",
          humorStyle: b.humorStyle,
          views: b.views,
          likes: b.likes,
          comments: b.comments,
          engagementRate: b.engagementRate,
        }));

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a comedy content analyst. Analyze YouTube humor videos and provide insights on what makes them work. Return valid JSON only.",
              },
              {
                role: "user",
                content: `Analyze these humor videos and for each provide what worked and tone notes. Videos: ${JSON.stringify(videosInfo)}. Return JSON: { "analyses": [{ "videoTitle": string, "humorStyle": string, "whatWorked": string, "toneNotes": string }] }`,
              },
            ],
            response_format: { type: "json_object" },
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) continue;

          const parsed = JSON.parse(content);
          const analyses = parsed.analyses || [];

          for (const bm of batch) {
            const analysis = analyses.find((a: any) => a.videoTitle === (bm.videoTitle || "Untitled"));
            if (!analysis) continue;

            const benchmarkId = bm.id;
            const whatWorked = analysis.whatWorked || "";
            const toneNotes = analysis.toneNotes || "";

            const updateData: any = { whatWorked, toneNotes };
            if (analysis.humorStyle) updateData.humorStyle = analysis.humorStyle;
            await db.update(humorBenchmarks).set(updateData).where(eq(humorBenchmarks.id, benchmarkId));

            analyzedResults.push({ ...bm, whatWorked, toneNotes });
            analyzedCount++;
          }
        } catch {
          continue;
        }
      }

      res.json({ analyzed: analyzedCount, results: analyzedResults });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to analyze", details: error.message });
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/system/api-status", requireAuth, (_req: Request, res: Response) => {
    res.json({
      openai: !!process.env.OPENAI_API_KEY || !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      youtube: !!process.env.YOUTUBE_API_KEY,
    });
  });

  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    const baseUrl = `https://${_req.headers.host}`;
    const pages = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/auth", priority: "0.8", changefreq: "monthly" },
      { loc: "/dashboard", priority: "0.7", changefreq: "daily" },
      { loc: "/ad-engine", priority: "0.9", changefreq: "daily" },
      { loc: "/humor-screener", priority: "0.7", changefreq: "daily" },
      { loc: "/copy-assistant", priority: "0.7", changefreq: "daily" },
      { loc: "/research", priority: "0.6", changefreq: "weekly" },
      { loc: "/knowledge", priority: "0.6", changefreq: "weekly" },
      { loc: "/intelligence", priority: "0.9", changefreq: "daily" },
      { loc: "/settings", priority: "0.3", changefreq: "monthly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/robots.txt", (_req: Request, res: Response) => {
    const baseUrl = `https://${_req.headers.host}`;
    res.header("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /settings

Sitemap: ${baseUrl}/sitemap.xml`);
  });

  registerAuthRoutes(app);
  registerAdEngineRoutes(app);
  registerHumorScreenerRoutes(app);
  registerCopyAssistantRoutes(app);
  registerEnvironmentRoutes(app);
  registerKnowledgeRoutes(app);
  registerContentStrategyRoutes(app);
  registerYouTubeResearchRoutes(app);

  const { registerIntelligenceRoutes } = await import("./intelligence-core/routes");
  registerIntelligenceRoutes(app);

  return httpServer;
}
