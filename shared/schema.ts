import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Users
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  password: text("password").notNull(),
  phone: text("phone").unique(),
  phoneVerified: boolean("phone_verified").default(false),
  displayName: text("display_name"),
  profilePhoto: text("profile_photo"),
  bio: text("bio"),
  city: text("city"),
  state: text("state"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isAdmin: boolean("is_admin").default(false),
  isOwner: boolean("is_owner").default(false),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").default(sql`now()`),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// Studio Campaigns
// ============================================================================

export const studioCampaigns = pgTable("studio_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  listingId: text("listing_id"),
  name: text("name").notNull(),
  description: text("description"),
  campaignType: text("campaign_type"),
  primaryGoal: text("primary_goal"),
  secondaryGoals: jsonb("secondary_goals"),
  valueProposition: text("value_proposition"),
  nonGoals: jsonb("non_goals"),
  audienceDescription: text("audience_description"),
  audienceSegments: jsonb("audience_segments"),
  languageStyle: text("language_style"),
  trustDynamics: text("trust_dynamics"),
  preferredTones: jsonb("preferred_tones"),
  disallowedTones: jsonb("disallowed_tones"),
  visualNotes: text("visual_notes"),
  voiceNotes: text("voice_notes"),
  platformsTargeted: jsonb("platforms_targeted"),
  platformNotes: jsonb("platform_notes"),
  riskProfile: text("risk_profile"),
  sensitiveTopics: jsonb("sensitive_topics"),
  priorFlags: jsonb("prior_flags"),
  adminWatch: boolean("admin_watch").default(false),
  status: text("status").default("draft"),
  conversationPhase: text("conversation_phase").default("intent_discovery"),
  conversationHistory: jsonb("conversation_history"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertStudioCampaignSchema = createInsertSchema(studioCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudioCampaign = z.infer<typeof insertStudioCampaignSchema>;
export type StudioCampaign = typeof studioCampaigns.$inferSelect;

// ============================================================================
// Studio Videos
// ============================================================================

export const studioVideos = pgTable("studio_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: text("campaign_id").notNull(),
  userId: text("user_id").notNull(),
  iterationNumber: integer("iteration_number").default(1),
  conceptSummary: text("concept_summary"),
  hookType: text("hook_type"),
  hookRationale: text("hook_rationale"),
  tone: text("tone"),
  platform: text("platform"),
  aspectRatio: text("aspect_ratio").default("9:16"),
  targetDuration: integer("target_duration").default(30),
  script: text("script"),
  captions: jsonb("captions"),
  onScreenText: jsonb("on_screen_text"),
  keywords: jsonb("keywords"),
  seoNotes: text("seo_notes"),
  visualPromptTexts: jsonb("visual_prompt_texts"),
  voiceId: text("voice_id"),
  voiceCharacteristics: jsonb("voice_characteristics"),
  generatedVideoUrl: text("generated_video_url"),
  thumbnailUrl: text("thumbnail_url"),
  violationClass: text("violation_class"),
  flaggedPhrases: jsonb("flagged_phrases"),
  warningsShown: jsonb("warnings_shown"),
  reviewStatus: text("review_status").default("pending"),
  approvalData: jsonb("approval_data"),
  adminRequired: boolean("admin_required").default(false),
  scheduledTime: timestamp("scheduled_time"),
  postedTime: timestamp("posted_time"),
  platformPostIds: jsonb("platform_post_ids"),
  regenerationCount: integer("regeneration_count").default(0),
  userFeedback: text("user_feedback"),
  aiAnalysis: text("ai_analysis"),
  listingDeepLink: text("listing_deep_link"),
  status: text("status").default("concept"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertStudioVideoSchema = createInsertSchema(studioVideos).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudioVideo = z.infer<typeof insertStudioVideoSchema>;
export type StudioVideo = typeof studioVideos.$inferSelect;

// ============================================================================
// Humor Performance (Serial PK)
// ============================================================================

export const humorPerformance = pgTable("humor_performance", {
  id: serial("id").primaryKey(),
  adScriptId: text("ad_script_id"),
  humorCategory: text("humor_category").notNull(),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  platformVideoId: text("platform_video_id"),
  publishedAt: timestamp("published_at"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  watchTimeSeconds: real("watch_time_seconds").default(0),
  avgWatchPercent: real("avg_watch_percent").default(0),
  engagementRate: real("engagement_rate").default(0),
  retentionScore: real("retention_score").default(0),
  totalDuration: real("total_duration"),
  setupDuration: real("setup_duration"),
  punchlineTiming: real("punchline_timing"),
  toneShiftCount: integer("tone_shift_count"),
  deliveryPaceWps: real("delivery_pace_wps"),
  conceptTransitionSpeed: real("concept_transition_speed"),
  escalationBeats: jsonb("escalation_beats"),
  retentionCurve: jsonb("retention_curve"),
  toneArc: text("tone_arc"),
  wordCount: integer("word_count"),
  notes: text("notes"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertHumorPerformanceSchema = createInsertSchema(humorPerformance).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHumorPerformance = z.infer<typeof insertHumorPerformanceSchema>;
export type HumorPerformance = typeof humorPerformance.$inferSelect;

// ============================================================================
// Humor Benchmarks (Serial PK)
// ============================================================================

export const humorBenchmarks = pgTable("humor_benchmarks", {
  id: serial("id").primaryKey(),
  creatorName: text("creator_name").notNull(),
  creatorHandle: text("creator_handle"),
  platform: text("platform").notNull(),
  humorStyle: text("humor_style").notNull(),
  videoUrl: text("video_url"),
  videoTitle: text("video_title"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  engagementRate: real("engagement_rate").default(0),
  whatWorked: text("what_worked"),
  toneNotes: text("tone_notes"),
  tags: jsonb("tags"),
  scrapedAt: timestamp("scraped_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertHumorBenchmarkSchema = createInsertSchema(humorBenchmarks).omit({ id: true, createdAt: true });
export type InsertHumorBenchmark = z.infer<typeof insertHumorBenchmarkSchema>;
export type HumorBenchmark = typeof humorBenchmarks.$inferSelect;

// ============================================================================
// Video Queue
// ============================================================================

export const videoQueue = pgTable("video_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").default("waiting"),
  priority: integer("priority").default(0),
  position: integer("position"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertVideoQueueSchema = createInsertSchema(videoQueue).omit({ id: true, createdAt: true });
export type InsertVideoQueue = z.infer<typeof insertVideoQueueSchema>;
export type VideoQueue = typeof videoQueue.$inferSelect;

// ============================================================================
// Performance Alerts
// ============================================================================

export const performanceAlerts = pgTable("performance_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(),
  severity: text("severity").default("warning"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: text("acknowledged_by"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPerformanceAlertSchema = createInsertSchema(performanceAlerts).omit({ id: true, createdAt: true });
export type InsertPerformanceAlert = z.infer<typeof insertPerformanceAlertSchema>;
export type PerformanceAlert = typeof performanceAlerts.$inferSelect;

// ============================================================================
// Studio Video Assets
// ============================================================================

export const studioVideoAssets = pgTable("studio_video_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id"),
  campaignId: text("campaign_id"),
  userId: text("user_id").notNull(),
  assetType: text("asset_type").notNull(),
  sourceType: text("source_type").notNull(),
  url: text("url"),
  description: text("description"),
  metadata: jsonb("metadata"),
  reusable: boolean("reusable").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertStudioVideoAssetSchema = createInsertSchema(studioVideoAssets).omit({ id: true, createdAt: true });
export type InsertStudioVideoAsset = z.infer<typeof insertStudioVideoAssetSchema>;
export type StudioVideoAsset = typeof studioVideoAssets.$inferSelect;

// ============================================================================
// Studio Creative Profiles
// ============================================================================

export const studioCreativeProfiles = pgTable("studio_creative_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(),
  preferredStyles: jsonb("preferred_styles"),
  platformStrengths: jsonb("platform_strengths"),
  riskTolerance: text("risk_tolerance").default("moderate"),
  commonAudiences: jsonb("common_audiences"),
  blindSpots: jsonb("blind_spots"),
  restrictionState: text("restriction_state").default("normal"),
  totalVideosCreated: integer("total_videos_created").default(0),
  totalVideosPosted: integer("total_videos_posted").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertStudioCreativeProfileSchema = createInsertSchema(studioCreativeProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudioCreativeProfile = z.infer<typeof insertStudioCreativeProfileSchema>;
export type StudioCreativeProfile = typeof studioCreativeProfiles.$inferSelect;

// ============================================================================
// Studio Campaign Memory
// ============================================================================

export const studioCampaignMemory = pgTable("studio_campaign_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: text("campaign_id").notNull(),
  userId: text("user_id").notNull(),
  successfulHooks: jsonb("successful_hooks"),
  failedHooks: jsonb("failed_hooks"),
  tonePerformanceMap: jsonb("tone_performance_map"),
  visualStylePreferences: jsonb("visual_style_preferences"),
  voicePreferences: jsonb("voice_preferences"),
  platformPerformanceNotes: jsonb("platform_performance_notes"),
  overridePatterns: jsonb("override_patterns"),
  adminInterventionHistory: jsonb("admin_intervention_history"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertStudioCampaignMemorySchema = createInsertSchema(studioCampaignMemory).omit({ id: true, updatedAt: true });
export type InsertStudioCampaignMemory = z.infer<typeof insertStudioCampaignMemorySchema>;
export type StudioCampaignMemory = typeof studioCampaignMemory.$inferSelect;

// ============================================================================
// API Keys
// ============================================================================

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformName: text("platform_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  apiSecret: text("api_secret").notNull(),
  permissions: jsonb("permissions"),
  isActive: boolean("is_active").default(true),
  rateLimit: integer("rate_limit").default(1000),
  createdAt: timestamp("created_at").default(sql`now()`),
  lastUsedAt: timestamp("last_used_at"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ============================================================================
// Environment Profiles
// ============================================================================

export const environmentProfiles = pgTable("environment_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: text("api_key_id"),
  platformName: text("platform_name").notNull(),
  platformUrl: text("platform_url"),
  platformType: text("platform_type"),
  industry: text("industry"),
  brandPersonality: text("brand_personality"),
  toneProfile: jsonb("tone_profile"),
  audienceProfile: jsonb("audience_profile"),
  discoveredProducts: jsonb("discovered_products"),
  suggestedAngles: jsonb("suggested_angles"),
  videoCreationBrief: jsonb("video_creation_brief"),
  competitorWeaknesses: jsonb("competitor_weaknesses"),
  emotionalTriggers: jsonb("emotional_triggers"),
  contentGaps: jsonb("content_gaps"),
  humorMapping: jsonb("humor_mapping"),
  seasonalHooks: jsonb("seasonal_hooks"),
  crawlData: jsonb("crawl_data"),
  crawlFrequency: text("crawl_frequency").default("weekly"),
  lastCrawledAt: timestamp("last_crawled_at"),
  nextCrawlAt: timestamp("next_crawl_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertEnvironmentProfileSchema = createInsertSchema(environmentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEnvironmentProfile = z.infer<typeof insertEnvironmentProfileSchema>;
export type EnvironmentProfile = typeof environmentProfiles.$inferSelect;

// ============================================================================
// Product Inventory
// ============================================================================

export const productInventory = pgTable("product_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: text("environment_id").notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  subcategory: text("subcategory"),
  price: real("price"),
  priceRange: text("price_range"),
  imageUrl: text("image_url"),
  pageUrl: text("page_url"),
  aiTags: jsonb("ai_tags"),
  aiCategory: text("ai_category"),
  contentAngles: jsonb("content_angles"),
  lastSeenAt: timestamp("last_seen_at").default(sql`now()`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertProductInventorySchema = createInsertSchema(productInventory).omit({ id: true, createdAt: true });
export type InsertProductInventory = z.infer<typeof insertProductInventorySchema>;
export type ProductInventory = typeof productInventory.$inferSelect;

// ============================================================================
// Knowledge Entries
// ============================================================================

export const knowledgeEntries = pgTable("knowledge_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: text("environment_id"),
  source: text("source").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: real("confidence").default(0.5),
  sources: jsonb("sources"),
  tags: jsonb("tags"),
  appliedCount: integer("applied_count").default(0),
  lastAppliedAt: timestamp("last_applied_at"),
  isPinned: boolean("is_pinned").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertKnowledgeEntrySchema = createInsertSchema(knowledgeEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeEntry = z.infer<typeof insertKnowledgeEntrySchema>;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;

// ============================================================================
// Research Queries
// ============================================================================

export const researchQueries = pgTable("research_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: text("environment_id"),
  userId: text("user_id"),
  queryText: text("query_text").notNull(),
  source: text("source").notNull(),
  researchType: text("research_type"),
  resultsFound: integer("results_found").default(0),
  relevanceScore: real("relevance_score"),
  knowledgeEntriesCreated: integer("knowledge_entries_created").default(0),
  status: text("status").default("pending"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertResearchQuerySchema = createInsertSchema(researchQueries).omit({ id: true, createdAt: true });
export type InsertResearchQuery = z.infer<typeof insertResearchQuerySchema>;
export type ResearchQuery = typeof researchQueries.$inferSelect;

// ============================================================================
// Content Strategies
// ============================================================================

export const contentStrategies = pgTable("content_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: text("environment_id").notNull(),
  audienceSegments: jsonb("audience_segments"),
  generatedCategories: jsonb("generated_categories"),
  ctaTemplates: jsonb("cta_templates"),
  performanceNotes: jsonb("performance_notes"),
  lastGeneratedAt: timestamp("last_generated_at").default(sql`now()`),
  performanceAdjustedAt: timestamp("performance_adjusted_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertContentStrategySchema = createInsertSchema(contentStrategies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentStrategy = z.infer<typeof insertContentStrategySchema>;
export type ContentStrategy = typeof contentStrategies.$inferSelect;

// ============================================================================
// Audience Insights
// ============================================================================

export const audienceInsights = pgTable("audience_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  environmentId: text("environment_id").notNull(),
  insightType: text("insight_type").notNull(),
  insightData: jsonb("insight_data").notNull(),
  confidence: real("confidence").default(0.5),
  sampleSize: integer("sample_size").default(0),
  source: text("source"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertAudienceInsightSchema = createInsertSchema(audienceInsights).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAudienceInsight = z.infer<typeof insertAudienceInsightSchema>;
export type AudienceInsight = typeof audienceInsights.$inferSelect;

// ============================================================================
// Ad Scripts
// ============================================================================

export const adScripts = pgTable("ad_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  scenarioId: text("scenario_id"),
  scenarioTitle: text("scenario_title"),
  humorCategory: text("humor_category"),
  format: text("format").default("portrait"),
  title: text("title").notNull(),
  scenes: jsonb("scenes").notNull(),
  brandClose: jsonb("brand_close"),
  totalDuration: real("total_duration"),
  voiceoverUrl: text("voiceover_url"),
  videoUrl: text("video_url"),
  status: text("status").default("draft"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertAdScriptSchema = createInsertSchema(adScripts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdScript = z.infer<typeof insertAdScriptSchema>;
export type AdScript = typeof adScripts.$inferSelect;

// ============================================================================
// Datasets - Core dataset registry
// ============================================================================

export const datasets = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  datasetType: text("dataset_type").notNull(),
  description: text("description"),
  featureExtractorId: text("feature_extractor_id"),
  targetMetricName: text("target_metric_name"),
  recordCount: integer("record_count").default(0),
  lastTrainedAt: timestamp("last_trained_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;

// ============================================================================
// Dataset Records - Individual records within a dataset
// ============================================================================

export const datasetRecords = pgTable("dataset_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: text("dataset_id").notNull(),
  sourceId: text("source_id"),
  sourceType: text("source_type"),
  rawFeatures: jsonb("raw_features"),
  normalizedFeatures: jsonb("normalized_features"),
  targetValue: real("target_value"),
  tierClassification: text("tier_classification"),
  splitGroup: text("split_group"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertDatasetRecordSchema = createInsertSchema(datasetRecords).omit({ id: true, createdAt: true });
export type InsertDatasetRecord = z.infer<typeof insertDatasetRecordSchema>;
export type DatasetRecord = typeof datasetRecords.$inferSelect;

// ============================================================================
// Engineered Features - Feature definitions per dataset type
// ============================================================================

export const engineeredFeatures = pgTable("engineered_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetType: text("dataset_type").notNull(),
  featureName: text("feature_name").notNull(),
  featureType: text("feature_type").notNull(),
  extractionMethod: text("extraction_method"),
  normalizationMethod: text("normalization_method").default("min_max"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  meanValue: real("mean_value"),
  stdDevValue: real("std_dev_value"),
  importance: real("importance").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertEngineeredFeatureSchema = createInsertSchema(engineeredFeatures).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEngineeredFeature = z.infer<typeof insertEngineeredFeatureSchema>;
export type EngineeredFeature = typeof engineeredFeatures.$inferSelect;

// ============================================================================
// Pattern Models - Trained model coefficients and metrics
// ============================================================================

export const patternModels = pgTable("pattern_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: text("dataset_id").notNull(),
  modelType: text("model_type").default("multivariate_regression"),
  coefficients: jsonb("coefficients").notNull(),
  intercept: real("intercept"),
  featureNames: jsonb("feature_names"),
  rSquared: real("r_squared"),
  mae: real("mae"),
  tierAccuracy: real("tier_accuracy"),
  directionalAccuracy: real("directional_accuracy"),
  trainSampleCount: integer("train_sample_count"),
  testSampleCount: integer("test_sample_count"),
  trainingMetrics: jsonb("training_metrics"),
  version: integer("version").default(1),
  status: text("status").default("active"),
  trainedAt: timestamp("trained_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPatternModelSchema = createInsertSchema(patternModels).omit({ id: true, createdAt: true });
export type InsertPatternModel = z.infer<typeof insertPatternModelSchema>;
export type PatternModel = typeof patternModels.$inferSelect;

// ============================================================================
// Prediction Logs - Every prediction made and its validation
// ============================================================================

export const predictionLogs = pgTable("prediction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotId: text("snapshot_id"),
  datasetId: text("dataset_id").notNull(),
  modelId: text("model_id").notNull(),
  predictedValue: real("predicted_value").notNull(),
  predictedTier: text("predicted_tier"),
  actualValue: real("actual_value"),
  actualTier: text("actual_tier"),
  error: real("error"),
  absoluteError: real("absolute_error"),
  directionallyCorrect: boolean("directionally_correct"),
  tierCorrect: boolean("tier_correct"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPredictionLogSchema = createInsertSchema(predictionLogs).omit({ id: true, createdAt: true });
export type InsertPredictionLog = z.infer<typeof insertPredictionLogSchema>;
export type PredictionLog = typeof predictionLogs.$inferSelect;

// ============================================================================
// Trend Signals - Trend tracking data points
// ============================================================================

export const trendSignals = pgTable("trend_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: text("dataset_id"),
  signalType: text("signal_type").notNull(),
  metricName: text("metric_name").notNull(),
  value: real("value").notNull(),
  rollingMean: real("rolling_mean"),
  zScore: real("z_score"),
  acceleration: real("acceleration"),
  isAnomaly: boolean("is_anomaly").default(false),
  windowSize: integer("window_size").default(10),
  metadata: jsonb("metadata"),
  observedAt: timestamp("observed_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertTrendSignalSchema = createInsertSchema(trendSignals).omit({ id: true, createdAt: true });
export type InsertTrendSignal = z.infer<typeof insertTrendSignalSchema>;
export type TrendSignal = typeof trendSignals.$inferSelect;

// ============================================================================
// Model Snapshots - Immutable pre-release prediction records
// ============================================================================

export const modelSnapshots = pgTable("model_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: text("dataset_id").notNull(),
  modelId: text("model_id"),
  featureVector: jsonb("feature_vector").notNull(),
  coefficientsUsed: jsonb("coefficients_used").notNull(),
  predictedValue: real("predicted_value").notNull(),
  predictedTier: text("predicted_tier"),
  confidence: real("confidence"),
  hashSignature: text("hash_signature").notNull(),
  uploadConfirmed: boolean("upload_confirmed").default(false),
  uploadConfirmedAt: timestamp("upload_confirmed_at"),
  performanceTrackingStarted: boolean("performance_tracking_started").default(false),
  sourceId: text("source_id"),
  sourceType: text("source_type"),
  isLocked: boolean("is_locked").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertModelSnapshotSchema = createInsertSchema(modelSnapshots).omit({ id: true, createdAt: true });
export type InsertModelSnapshot = z.infer<typeof insertModelSnapshotSchema>;
export type ModelSnapshot = typeof modelSnapshots.$inferSelect;

// ============================================================================
// Experiment Groups - Exploration vs exploitation tracking
// ============================================================================

export const experimentGroups = pgTable("experiment_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: text("dataset_id").notNull(),
  groupType: text("group_type").notNull(),
  epsilon: real("epsilon").default(0.15),
  mutationParameters: jsonb("mutation_parameters"),
  originalFeatures: jsonb("original_features"),
  mutatedFeatures: jsonb("mutated_features"),
  predictedValue: real("predicted_value"),
  actualValue: real("actual_value"),
  sourceId: text("source_id"),
  sourceType: text("source_type"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertExperimentGroupSchema = createInsertSchema(experimentGroups).omit({ id: true, createdAt: true });
export type InsertExperimentGroup = z.infer<typeof insertExperimentGroupSchema>;
export type ExperimentGroup = typeof experimentGroups.$inferSelect;

// ============================================================================
// External Signals - Multi-layer signal ingestion data
// ============================================================================

export const externalSignals = pgTable("external_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceName: text("source_name").notNull(),
  layer: integer("layer").notNull(),
  keyword: text("keyword"),
  normalizedFeatures: jsonb("normalized_features"),
  rawData: jsonb("raw_data"),
  fetchedAt: timestamp("fetched_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertExternalSignalSchema = createInsertSchema(externalSignals).omit({ id: true, createdAt: true });
export type InsertExternalSignal = z.infer<typeof insertExternalSignalSchema>;
export type ExternalSignal = typeof externalSignals.$inferSelect;

// ============================================================================
// Cross Layer Patterns - Cross-layer correlation detection
// ============================================================================

export const crossLayerPatterns = pgTable("cross_layer_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalCombination: jsonb("signal_combination").notNull(),
  sourceLayer: integer("source_layer").notNull(),
  targetLayer: integer("target_layer").notNull(),
  lagDays: integer("lag_days"),
  correlationStrength: real("correlation_strength"),
  confidence: real("confidence"),
  sampleSize: integer("sample_size").default(0),
  keyword: text("keyword"),
  status: text("status").default("active"),
  lastObserved: timestamp("last_observed"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertCrossLayerPatternSchema = createInsertSchema(crossLayerPatterns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrossLayerPattern = z.infer<typeof insertCrossLayerPatternSchema>;
export type CrossLayerPattern = typeof crossLayerPatterns.$inferSelect;
