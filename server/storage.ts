import { db } from "./db";
import { eq, desc, and, ilike, sql, asc } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  adScripts, type AdScript, type InsertAdScript,
  studioCampaigns, type StudioCampaign, type InsertStudioCampaign,
  humorPerformance, type HumorPerformance, type InsertHumorPerformance,
  humorBenchmarks, type HumorBenchmark, type InsertHumorBenchmark,
  studioCreativeProfiles, type StudioCreativeProfile, type InsertStudioCreativeProfile,
  environmentProfiles, type EnvironmentProfile, type InsertEnvironmentProfile,
  productInventory, type ProductInventory, type InsertProductInventory,
  knowledgeEntries, type KnowledgeEntry, type InsertKnowledgeEntry,
  researchQueries, type ResearchQuery, type InsertResearchQuery,
  contentStrategies, type ContentStrategy, type InsertContentStrategy,
  audienceInsights, type AudienceInsight, type InsertAudienceInsight,
  performanceAlerts, type PerformanceAlert, type InsertPerformanceAlert,
  videoQueue, type VideoQueue, type InsertVideoQueue,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  createAdScript(data: InsertAdScript): Promise<AdScript>;
  getAdScript(id: string): Promise<AdScript | undefined>;
  getAdScriptsByUser(userId: string): Promise<AdScript[]>;
  updateAdScript(id: string, data: Partial<AdScript>): Promise<AdScript | undefined>;
  deleteAdScript(id: string): Promise<void>;

  createCampaign(data: InsertStudioCampaign): Promise<StudioCampaign>;
  getCampaign(id: string): Promise<StudioCampaign | undefined>;
  getCampaignsByUser(userId: string): Promise<StudioCampaign[]>;
  updateCampaign(id: string, data: Partial<StudioCampaign>): Promise<StudioCampaign | undefined>;
  deleteCampaign(id: string): Promise<void>;

  createPerformance(data: InsertHumorPerformance): Promise<HumorPerformance>;
  getPerformanceRecords(filters?: { category?: string; platform?: string; sort?: string }): Promise<HumorPerformance[]>;
  getTopPerformers(limit?: number): Promise<HumorPerformance[]>;

  createBenchmark(data: InsertHumorBenchmark): Promise<HumorBenchmark>;
  getBenchmarks(filters?: { creator?: string; style?: string; platform?: string }): Promise<HumorBenchmark[]>;
  getBenchmarkByUrl(url: string): Promise<HumorBenchmark | undefined>;
  getTopBenchmarks(limit?: number): Promise<HumorBenchmark[]>;

  getCreativeProfile(userId: string): Promise<StudioCreativeProfile | undefined>;
  createCreativeProfile(data: InsertStudioCreativeProfile): Promise<StudioCreativeProfile>;
  updateCreativeProfile(userId: string, data: Partial<StudioCreativeProfile>): Promise<StudioCreativeProfile | undefined>;
  resetCreativeProfile(userId: string): Promise<StudioCreativeProfile | undefined>;

  createEnvironmentProfile(data: InsertEnvironmentProfile): Promise<EnvironmentProfile>;
  getEnvironmentProfile(id: string): Promise<EnvironmentProfile | undefined>;
  getEnvironmentProfiles(): Promise<EnvironmentProfile[]>;
  updateEnvironmentProfile(id: string, data: Partial<EnvironmentProfile>): Promise<EnvironmentProfile | undefined>;

  createProduct(data: InsertProductInventory): Promise<ProductInventory>;
  getProductsByEnvironment(environmentId: string): Promise<ProductInventory[]>;
  deleteProduct(id: string): Promise<void>;

  createKnowledgeEntry(data: InsertKnowledgeEntry): Promise<KnowledgeEntry>;
  getKnowledgeEntries(filters?: { environmentId?: string; category?: string; source?: string }): Promise<KnowledgeEntry[]>;
  getKnowledgeEntry(id: string): Promise<KnowledgeEntry | undefined>;
  updateKnowledgeEntry(id: string, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry | undefined>;
  deleteKnowledgeEntry(id: string): Promise<void>;

  createResearchQuery(data: InsertResearchQuery): Promise<ResearchQuery>;
  getResearchQueries(userId?: string): Promise<ResearchQuery[]>;
  updateResearchQuery(id: string, data: Partial<ResearchQuery>): Promise<ResearchQuery | undefined>;

  createContentStrategy(data: InsertContentStrategy): Promise<ContentStrategy>;
  getContentStrategy(environmentId: string): Promise<ContentStrategy | undefined>;
  updateContentStrategy(id: string, data: Partial<ContentStrategy>): Promise<ContentStrategy | undefined>;

  createAudienceInsight(data: InsertAudienceInsight): Promise<AudienceInsight>;
  getAudienceInsights(environmentId: string): Promise<AudienceInsight[]>;

  createAlert(data: InsertPerformanceAlert): Promise<PerformanceAlert>;
  getAlerts(): Promise<PerformanceAlert[]>;
  acknowledgeAlert(id: string, userId: string): Promise<void>;

  addToQueue(data: InsertVideoQueue): Promise<VideoQueue>;
  getQueuePosition(id: string): Promise<VideoQueue | undefined>;
  getQueueByUser(userId: string): Promise<VideoQueue[]>;
  updateQueueItem(id: string, data: Partial<VideoQueue>): Promise<void>;

  getDashboardStats(userId: string): Promise<{ totalScripts: number; totalCampaigns: number; totalPerformance: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async createAdScript(data: InsertAdScript): Promise<AdScript> {
    const result = await db.insert(adScripts).values(data).returning();
    return result[0];
  }

  async getAdScript(id: string): Promise<AdScript | undefined> {
    const result = await db.select().from(adScripts).where(eq(adScripts.id, id));
    return result[0];
  }

  async getAdScriptsByUser(userId: string): Promise<AdScript[]> {
    return db.select().from(adScripts).where(eq(adScripts.userId, userId)).orderBy(desc(adScripts.createdAt));
  }

  async updateAdScript(id: string, data: Partial<AdScript>): Promise<AdScript | undefined> {
    const result = await db.update(adScripts).set(data).where(eq(adScripts.id, id)).returning();
    return result[0];
  }

  async deleteAdScript(id: string): Promise<void> {
    await db.delete(adScripts).where(eq(adScripts.id, id));
  }

  async createCampaign(data: InsertStudioCampaign): Promise<StudioCampaign> {
    const result = await db.insert(studioCampaigns).values(data).returning();
    return result[0];
  }

  async getCampaign(id: string): Promise<StudioCampaign | undefined> {
    const result = await db.select().from(studioCampaigns).where(eq(studioCampaigns.id, id));
    return result[0];
  }

  async getCampaignsByUser(userId: string): Promise<StudioCampaign[]> {
    return db.select().from(studioCampaigns).where(eq(studioCampaigns.userId, userId)).orderBy(desc(studioCampaigns.createdAt));
  }

  async updateCampaign(id: string, data: Partial<StudioCampaign>): Promise<StudioCampaign | undefined> {
    const result = await db.update(studioCampaigns).set(data).where(eq(studioCampaigns.id, id)).returning();
    return result[0];
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(studioCampaigns).where(eq(studioCampaigns.id, id));
  }

  async createPerformance(data: InsertHumorPerformance): Promise<HumorPerformance> {
    const result = await db.insert(humorPerformance).values(data).returning();
    return result[0];
  }

  async getPerformanceRecords(filters?: { category?: string; platform?: string; sort?: string }): Promise<HumorPerformance[]> {
    const conditions: any[] = [];
    if (filters?.category) conditions.push(eq(humorPerformance.humorCategory, filters.category));
    if (filters?.platform) conditions.push(eq(humorPerformance.platform, filters.platform));

    const query = db.select().from(humorPerformance);
    if (conditions.length > 0) query.where(and(...conditions));

    if (filters?.sort === "views") {
      query.orderBy(desc(humorPerformance.views));
    } else if (filters?.sort === "engagement") {
      query.orderBy(desc(humorPerformance.engagementRate));
    } else {
      query.orderBy(desc(humorPerformance.createdAt));
    }

    return query;
  }

  async getTopPerformers(limit: number = 10): Promise<HumorPerformance[]> {
    return db.select().from(humorPerformance).orderBy(desc(humorPerformance.engagementRate)).limit(limit);
  }

  async createBenchmark(data: InsertHumorBenchmark): Promise<HumorBenchmark> {
    const result = await db.insert(humorBenchmarks).values(data).returning();
    return result[0];
  }

  async getBenchmarks(filters?: { creator?: string; style?: string; platform?: string }): Promise<HumorBenchmark[]> {
    const conditions: any[] = [];
    if (filters?.creator) conditions.push(ilike(humorBenchmarks.creatorName, `%${filters.creator}%`));
    if (filters?.style) conditions.push(eq(humorBenchmarks.humorStyle, filters.style));
    if (filters?.platform) conditions.push(eq(humorBenchmarks.platform, filters.platform));

    const query = db.select().from(humorBenchmarks);
    if (conditions.length > 0) query.where(and(...conditions));

    return query.orderBy(desc(humorBenchmarks.createdAt));
  }

  async getBenchmarkByUrl(url: string): Promise<HumorBenchmark | undefined> {
    const result = await db.select().from(humorBenchmarks).where(eq(humorBenchmarks.videoUrl, url));
    return result[0];
  }

  async getTopBenchmarks(limit: number = 10): Promise<HumorBenchmark[]> {
    return db.select().from(humorBenchmarks).orderBy(desc(humorBenchmarks.engagementRate)).limit(limit);
  }

  async getCreativeProfile(userId: string): Promise<StudioCreativeProfile | undefined> {
    const result = await db.select().from(studioCreativeProfiles).where(eq(studioCreativeProfiles.userId, userId));
    return result[0];
  }

  async createCreativeProfile(data: InsertStudioCreativeProfile): Promise<StudioCreativeProfile> {
    const result = await db.insert(studioCreativeProfiles).values(data).returning();
    return result[0];
  }

  async updateCreativeProfile(userId: string, data: Partial<StudioCreativeProfile>): Promise<StudioCreativeProfile | undefined> {
    const result = await db.update(studioCreativeProfiles).set(data).where(eq(studioCreativeProfiles.userId, userId)).returning();
    return result[0];
  }

  async resetCreativeProfile(userId: string): Promise<StudioCreativeProfile | undefined> {
    const result = await db.update(studioCreativeProfiles).set({
      preferredStyles: null,
      platformStrengths: null,
      riskTolerance: "moderate",
      commonAudiences: null,
      blindSpots: null,
      restrictionState: "normal",
      totalVideosCreated: 0,
      totalVideosPosted: 0,
    }).where(eq(studioCreativeProfiles.userId, userId)).returning();
    return result[0];
  }

  async createEnvironmentProfile(data: InsertEnvironmentProfile): Promise<EnvironmentProfile> {
    const result = await db.insert(environmentProfiles).values(data).returning();
    return result[0];
  }

  async getEnvironmentProfile(id: string): Promise<EnvironmentProfile | undefined> {
    const result = await db.select().from(environmentProfiles).where(eq(environmentProfiles.id, id));
    return result[0];
  }

  async getEnvironmentProfiles(): Promise<EnvironmentProfile[]> {
    return db.select().from(environmentProfiles).orderBy(desc(environmentProfiles.createdAt));
  }

  async updateEnvironmentProfile(id: string, data: Partial<EnvironmentProfile>): Promise<EnvironmentProfile | undefined> {
    const result = await db.update(environmentProfiles).set(data).where(eq(environmentProfiles.id, id)).returning();
    return result[0];
  }

  async createProduct(data: InsertProductInventory): Promise<ProductInventory> {
    const result = await db.insert(productInventory).values(data).returning();
    return result[0];
  }

  async getProductsByEnvironment(environmentId: string): Promise<ProductInventory[]> {
    return db.select().from(productInventory).where(eq(productInventory.environmentId, environmentId));
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(productInventory).where(eq(productInventory.id, id));
  }

  async createKnowledgeEntry(data: InsertKnowledgeEntry): Promise<KnowledgeEntry> {
    const result = await db.insert(knowledgeEntries).values(data).returning();
    return result[0];
  }

  async getKnowledgeEntries(filters?: { environmentId?: string; category?: string; source?: string }): Promise<KnowledgeEntry[]> {
    const conditions: any[] = [];
    if (filters?.environmentId) conditions.push(eq(knowledgeEntries.environmentId, filters.environmentId));
    if (filters?.category) conditions.push(eq(knowledgeEntries.category, filters.category));
    if (filters?.source) conditions.push(eq(knowledgeEntries.source, filters.source));

    const query = db.select().from(knowledgeEntries);
    if (conditions.length > 0) query.where(and(...conditions));

    return query.orderBy(desc(knowledgeEntries.createdAt));
  }

  async getKnowledgeEntry(id: string): Promise<KnowledgeEntry | undefined> {
    const result = await db.select().from(knowledgeEntries).where(eq(knowledgeEntries.id, id));
    return result[0];
  }

  async updateKnowledgeEntry(id: string, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry | undefined> {
    const result = await db.update(knowledgeEntries).set(data).where(eq(knowledgeEntries.id, id)).returning();
    return result[0];
  }

  async deleteKnowledgeEntry(id: string): Promise<void> {
    await db.delete(knowledgeEntries).where(eq(knowledgeEntries.id, id));
  }

  async createResearchQuery(data: InsertResearchQuery): Promise<ResearchQuery> {
    const result = await db.insert(researchQueries).values(data).returning();
    return result[0];
  }

  async getResearchQueries(userId?: string): Promise<ResearchQuery[]> {
    if (userId) {
      return db.select().from(researchQueries).where(eq(researchQueries.userId, userId)).orderBy(desc(researchQueries.createdAt));
    }
    return db.select().from(researchQueries).orderBy(desc(researchQueries.createdAt));
  }

  async updateResearchQuery(id: string, data: Partial<ResearchQuery>): Promise<ResearchQuery | undefined> {
    const result = await db.update(researchQueries).set(data).where(eq(researchQueries.id, id)).returning();
    return result[0];
  }

  async createContentStrategy(data: InsertContentStrategy): Promise<ContentStrategy> {
    const result = await db.insert(contentStrategies).values(data).returning();
    return result[0];
  }

  async getContentStrategy(environmentId: string): Promise<ContentStrategy | undefined> {
    const result = await db.select().from(contentStrategies).where(eq(contentStrategies.environmentId, environmentId));
    return result[0];
  }

  async updateContentStrategy(id: string, data: Partial<ContentStrategy>): Promise<ContentStrategy | undefined> {
    const result = await db.update(contentStrategies).set(data).where(eq(contentStrategies.id, id)).returning();
    return result[0];
  }

  async createAudienceInsight(data: InsertAudienceInsight): Promise<AudienceInsight> {
    const result = await db.insert(audienceInsights).values(data).returning();
    return result[0];
  }

  async getAudienceInsights(environmentId: string): Promise<AudienceInsight[]> {
    return db.select().from(audienceInsights).where(eq(audienceInsights.environmentId, environmentId)).orderBy(desc(audienceInsights.createdAt));
  }

  async createAlert(data: InsertPerformanceAlert): Promise<PerformanceAlert> {
    const result = await db.insert(performanceAlerts).values(data).returning();
    return result[0];
  }

  async getAlerts(): Promise<PerformanceAlert[]> {
    return db.select().from(performanceAlerts).orderBy(desc(performanceAlerts.createdAt));
  }

  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    await db.update(performanceAlerts).set({ acknowledged: true, acknowledgedBy: userId }).where(eq(performanceAlerts.id, id));
  }

  async addToQueue(data: InsertVideoQueue): Promise<VideoQueue> {
    const result = await db.insert(videoQueue).values(data).returning();
    return result[0];
  }

  async getQueuePosition(id: string): Promise<VideoQueue | undefined> {
    const result = await db.select().from(videoQueue).where(eq(videoQueue.id, id));
    return result[0];
  }

  async getQueueByUser(userId: string): Promise<VideoQueue[]> {
    return db.select().from(videoQueue).where(eq(videoQueue.userId, userId)).orderBy(asc(videoQueue.createdAt));
  }

  async updateQueueItem(id: string, data: Partial<VideoQueue>): Promise<void> {
    await db.update(videoQueue).set(data).where(eq(videoQueue.id, id));
  }

  async getDashboardStats(userId: string): Promise<{ totalScripts: number; totalCampaigns: number; totalPerformance: number }> {
    const [scriptsResult, campaignsResult, performanceResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(adScripts).where(eq(adScripts.userId, userId)),
      db.select({ count: sql<number>`count(*)` }).from(studioCampaigns).where(eq(studioCampaigns.userId, userId)),
      db.select({ count: sql<number>`count(*)` }).from(humorPerformance),
    ]);

    return {
      totalScripts: Number(scriptsResult[0]?.count ?? 0),
      totalCampaigns: Number(campaignsResult[0]?.count ?? 0),
      totalPerformance: Number(performanceResult[0]?.count ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();
