import { z } from "zod";

export const agentTypeSchema = z.enum([
  "creative_studio",
  "website_builder",
  "voiceover",
  "paid_media",
  // Phase 2a – Family C: Web & E-commerce
  "website_multilang",
  "funnel_builder",
  "agency_delivery",
  "shop_builder",
  "ecommerce_growth",
  // Phase 2a – Family D: Social Media
  "social_automation",
  "facebook_growth",
  "social_engagement",
  "social_monetization",
  // Phase 2a – Family E: Ads & CRM
  "ads_warrior",
  "crm_loyalty",
  // Phase 2a – Family H: Membership & Local
  "membership_builder",
  "local_growth"
]);

export const projectStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived"
]);

export const briefStatusSchema = z.enum([
  "submitted",
  "parsed",
  "needs_clarification",
  "approved",
  "archived"
]);

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "canceled"
]);

export const clientMemoryTypeSchema = z.enum([
  "fact",
  "preference",
  "constraint",
  "approved_copy",
  "approved_visual"
]);

const trimmedStringSchema = z.string().trim().min(1);
const nullableTrimmedStringSchema = trimmedStringSchema.nullable();

export const clientMemoryEntrySchema = z.object({
  id: trimmedStringSchema,
  memoryType: clientMemoryTypeSchema,
  key: trimmedStringSchema,
  value: z.unknown(),
  valueSummary: trimmedStringSchema,
  source: nullableTrimmedStringSchema,
  confidenceScore: z.number().min(0).max(1).nullable()
});

export const clientBrandSnapshotSchema = z.object({
  brandId: nullableTrimmedStringSchema,
  brandName: nullableTrimmedStringSchema,
  websiteUrl: nullableTrimmedStringSchema,
  industry: nullableTrimmedStringSchema,
  targetAudience: nullableTrimmedStringSchema,
  toneOfVoice: nullableTrimmedStringSchema,
  brandGuidelines: z.unknown().nullable()
});

export const clientMemoryContextSchema = z.object({
  brand: clientBrandSnapshotSchema,
  facts: z.array(trimmedStringSchema).default([]),
  preferences: z.array(trimmedStringSchema).default([]),
  constraints: z.array(trimmedStringSchema).default([]),
  approvedExamples: z.array(trimmedStringSchema).default([]),
  entries: z.array(clientMemoryEntrySchema).default([])
});

const parsedBriefBaseSchema = z.object({
  title: trimmedStringSchema,
  summary: trimmedStringSchema,
  objectives: z.array(trimmedStringSchema).min(1),
  targetAudience: z.array(trimmedStringSchema).default([]),
  keyMessages: z.array(trimmedStringSchema).default([]),
  deliverables: z.array(trimmedStringSchema).default([]),
  constraints: z.array(trimmedStringSchema).default([]),
  references: z.array(trimmedStringSchema).default([]),
  tone: nullableTrimmedStringSchema,
  callToAction: nullableTrimmedStringSchema,
  locale: nullableTrimmedStringSchema,
  budget: nullableTrimmedStringSchema,
  timeline: nullableTrimmedStringSchema,
  successMetrics: z.array(trimmedStringSchema).default([]),
  missingInformation: z.array(trimmedStringSchema).default([]),
  memoryContext: clientMemoryContextSchema
});

export const creativeStudioDetailsSchema = z.object({
  subject: nullableTrimmedStringSchema,
  desiredStyle: nullableTrimmedStringSchema,
  assetFormats: z.array(trimmedStringSchema).default([]),
  requestedFormats: z.array(trimmedStringSchema).default([]),
  visualDirections: z.array(trimmedStringSchema).default([]),
  copyToInclude: z.array(trimmedStringSchema).default([]),
  brandingColors: z.array(trimmedStringSchema).default([]),
  brandingNotes: z.array(trimmedStringSchema).default([]),
  logoRequested: z.boolean().default(false),
  deliverableCount: z.number().int().positive().nullable(),
  visualReferences: z.array(trimmedStringSchema).default([])
});

export const websiteBuilderDetailsSchema = z.object({
  primaryCta: nullableTrimmedStringSchema,
  requiredPages: z.array(trimmedStringSchema).default([]),
  siteMapSections: z.array(trimmedStringSchema).default([]),
  technicalConstraints: z.array(trimmedStringSchema).default([]),
  siteType: nullableTrimmedStringSchema,
  businessSector: nullableTrimmedStringSchema,
  targetAudienceDescription: nullableTrimmedStringSchema,
  existingContent: z.array(trimmedStringSchema).default([]),
  styleTone: nullableTrimmedStringSchema
});

export const voiceoverDetailsSchema = z.object({
  language: nullableTrimmedStringSchema,
  durationSeconds: z.number().int().positive().nullable(),
  voiceStyle: nullableTrimmedStringSchema,
  scriptConstraints: z.array(trimmedStringSchema).default([]),
  usage: z.string().trim().min(1).nullable().default(null),
  messageSubject: z.string().trim().min(1).nullable().default(null),
  desiredTone: z.string().trim().min(1).nullable().default(null)
});

export const paidMediaDetailsSchema = z.object({
  offerOrProduct: nullableTrimmedStringSchema,
  platforms: z.array(trimmedStringSchema).default([]),
  campaignObjective: nullableTrimmedStringSchema,
  adFormats: z.array(trimmedStringSchema).default([]),
  audienceInsights: z.array(trimmedStringSchema).default([]),
  landingPageUrl: nullableTrimmedStringSchema,
  testIdeas: z.array(trimmedStringSchema).default([])
});

// ─── Phase 2a Agent Detail Schemas ───────────────────────────────────────────

export const websiteMultilangDetailsSchema = z.object({
  targetLanguages: z.array(trimmedStringSchema).default([]),
  sourceLanguage: nullableTrimmedStringSchema,
  siteType: nullableTrimmedStringSchema,
  requiredPages: z.array(trimmedStringSchema).default([]),
  seoLocalization: z.boolean().default(true),
  culturalAdaptation: z.boolean().default(true),
  technicalConstraints: z.array(trimmedStringSchema).default([])
});

export const funnelBuilderDetailsSchema = z.object({
  funnelType: nullableTrimmedStringSchema,
  offer: nullableTrimmedStringSchema,
  stages: z.array(trimmedStringSchema).default([]),
  primaryCta: nullableTrimmedStringSchema,
  conversionGoal: nullableTrimmedStringSchema,
  trafficSource: z.array(trimmedStringSchema).default([]),
  existingAssets: z.array(trimmedStringSchema).default([])
});

export const agencyDeliveryDetailsSchema = z.object({
  clientName: nullableTrimmedStringSchema,
  projectScope: nullableTrimmedStringSchema,
  deliverables: z.array(trimmedStringSchema).default([]),
  brandingIncluded: z.boolean().default(true),
  reportFormat: nullableTrimmedStringSchema,
  presentationStyle: nullableTrimmedStringSchema
});

export const shopBuilderDetailsSchema = z.object({
  shopType: nullableTrimmedStringSchema,
  productCount: z.number().int().positive().nullable(),
  categories: z.array(trimmedStringSchema).default([]),
  paymentMethods: z.array(trimmedStringSchema).default([]),
  shippingZones: z.array(trimmedStringSchema).default([]),
  technicalPlatform: nullableTrimmedStringSchema,
  conversionOptimization: z.boolean().default(true)
});

export const ecommerceGrowthDetailsSchema = z.object({
  products: z.array(trimmedStringSchema).default([]),
  targetKeywords: z.array(trimmedStringSchema).default([]),
  competitorUrls: z.array(trimmedStringSchema).default([]),
  growthLevers: z.array(trimmedStringSchema).default([]),
  currentRevenue: nullableTrimmedStringSchema,
  targetRevenue: nullableTrimmedStringSchema
});

export const socialAutomationDetailsSchema = z.object({
  platforms: z.array(trimmedStringSchema).default([]),
  postFrequency: nullableTrimmedStringSchema,
  contentMix: z.array(trimmedStringSchema).default([]),
  hashtagStrategy: z.boolean().default(true),
  bestPostingTimes: z.boolean().default(true),
  calendarDays: z.number().int().positive().default(30)
});

export const facebookGrowthDetailsSchema = z.object({
  pageType: nullableTrimmedStringSchema,
  currentFollowers: z.number().int().nullable(),
  targetFollowers: z.number().int().nullable(),
  contentTypes: z.array(trimmedStringSchema).default([]),
  reelsStrategy: z.boolean().default(true),
  engagementTactics: z.array(trimmedStringSchema).default([])
});

export const socialEngagementDetailsSchema = z.object({
  platforms: z.array(trimmedStringSchema).default([]),
  commentTypes: z.array(trimmedStringSchema).default([]),
  responsePersona: nullableTrimmedStringSchema,
  dmTemplates: z.boolean().default(true),
  escalationRules: z.array(trimmedStringSchema).default([]),
  brandVoice: nullableTrimmedStringSchema
});

export const socialMonetizationDetailsSchema = z.object({
  platforms: z.array(trimmedStringSchema).default([]),
  audienceSize: nullableTrimmedStringSchema,
  monetizationChannels: z.array(trimmedStringSchema).default([]),
  productIdeas: z.array(trimmedStringSchema).default([]),
  revenueTarget: nullableTrimmedStringSchema,
  timeline: nullableTrimmedStringSchema
});

export const adsWarriorDetailsSchema = z.object({
  platforms: z.array(trimmedStringSchema).default([]),
  totalBudget: nullableTrimmedStringSchema,
  campaignObjectives: z.array(trimmedStringSchema).default([]),
  targetAudienceDetails: z.array(trimmedStringSchema).default([]),
  offerOrProduct: nullableTrimmedStringSchema,
  existingCreatives: z.array(trimmedStringSchema).default([]),
  competitorAnalysis: z.boolean().default(false)
});

export const crmLoyaltyDetailsSchema = z.object({
  programType: nullableTrimmedStringSchema,
  customerSegments: z.array(trimmedStringSchema).default([]),
  rewardMechanisms: z.array(trimmedStringSchema).default([]),
  automationTriggers: z.array(trimmedStringSchema).default([]),
  retentionGoal: nullableTrimmedStringSchema,
  currentChurnRate: nullableTrimmedStringSchema
});

export const membershipBuilderDetailsSchema = z.object({
  membershipTiers: z.array(trimmedStringSchema).default([]),
  contentTypes: z.array(trimmedStringSchema).default([]),
  pricingModel: nullableTrimmedStringSchema,
  platform: nullableTrimmedStringSchema,
  onboardingFlow: z.boolean().default(true),
  communityFeatures: z.array(trimmedStringSchema).default([])
});

export const localGrowthDetailsSchema = z.object({
  businessType: nullableTrimmedStringSchema,
  location: nullableTrimmedStringSchema,
  radius: nullableTrimmedStringSchema,
  acquisitionChannels: z.array(trimmedStringSchema).default([]),
  localSeoNeeded: z.boolean().default(true),
  googleMyBusiness: z.boolean().default(true),
  competitorAnalysis: z.boolean().default(false)
});

export const creativeStudioParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("creative_studio"),
  agentDetails: creativeStudioDetailsSchema
});

export const websiteBuilderParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("website_builder"),
  agentDetails: websiteBuilderDetailsSchema
});

export const voiceoverParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("voiceover"),
  agentDetails: voiceoverDetailsSchema
});

export const paidMediaParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("paid_media"),
  agentDetails: paidMediaDetailsSchema
});

// Phase 2a parsed brief schemas
export const websiteMultilangParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("website_multilang"),
  agentDetails: websiteMultilangDetailsSchema
});

export const funnelBuilderParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("funnel_builder"),
  agentDetails: funnelBuilderDetailsSchema
});

export const agencyDeliveryParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("agency_delivery"),
  agentDetails: agencyDeliveryDetailsSchema
});

export const shopBuilderParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("shop_builder"),
  agentDetails: shopBuilderDetailsSchema
});

export const ecommerceGrowthParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("ecommerce_growth"),
  agentDetails: ecommerceGrowthDetailsSchema
});

export const socialAutomationParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("social_automation"),
  agentDetails: socialAutomationDetailsSchema
});

export const facebookGrowthParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("facebook_growth"),
  agentDetails: facebookGrowthDetailsSchema
});

export const socialEngagementParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("social_engagement"),
  agentDetails: socialEngagementDetailsSchema
});

export const socialMonetizationParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("social_monetization"),
  agentDetails: socialMonetizationDetailsSchema
});

export const adsWarriorParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("ads_warrior"),
  agentDetails: adsWarriorDetailsSchema
});

export const crmLoyaltyParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("crm_loyalty"),
  agentDetails: crmLoyaltyDetailsSchema
});

export const membershipBuilderParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("membership_builder"),
  agentDetails: membershipBuilderDetailsSchema
});

export const localGrowthParsedBriefSchema = parsedBriefBaseSchema.extend({
  agentType: z.literal("local_growth"),
  agentDetails: localGrowthDetailsSchema
});

export const parsedBriefSchema = z.discriminatedUnion("agentType", [
  creativeStudioParsedBriefSchema,
  websiteBuilderParsedBriefSchema,
  voiceoverParsedBriefSchema,
  paidMediaParsedBriefSchema,
  websiteMultilangParsedBriefSchema,
  funnelBuilderParsedBriefSchema,
  agencyDeliveryParsedBriefSchema,
  shopBuilderParsedBriefSchema,
  ecommerceGrowthParsedBriefSchema,
  socialAutomationParsedBriefSchema,
  facebookGrowthParsedBriefSchema,
  socialEngagementParsedBriefSchema,
  socialMonetizationParsedBriefSchema,
  adsWarriorParsedBriefSchema,
  crmLoyaltyParsedBriefSchema,
  membershipBuilderParsedBriefSchema,
  localGrowthParsedBriefSchema
]);

export const workflowJobPayloadSchema = z.object({
  jobId: z.string().uuid(),
  agentType: agentTypeSchema
});

export type AgentType = z.infer<typeof agentTypeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type BriefStatus = z.infer<typeof briefStatusSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ClientMemoryType = z.infer<typeof clientMemoryTypeSchema>;
export type ClientMemoryEntry = z.infer<typeof clientMemoryEntrySchema>;
export type ClientMemoryContext = z.infer<typeof clientMemoryContextSchema>;
export type ParsedBriefJson = z.infer<typeof parsedBriefSchema>;
export type ParsedBriefByAgentType<TAgentType extends AgentType> = Extract<
  ParsedBriefJson,
  { agentType: TAgentType }
>;
export type WorkflowJobPayload = z.infer<typeof workflowJobPayloadSchema>;