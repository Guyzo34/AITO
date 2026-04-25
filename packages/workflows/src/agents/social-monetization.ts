import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "social-monetization-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"social_monetization">;
type ParsedBrief = ParsedBriefByAgentType<"social_monetization">;

function toJson(v: unknown): Prisma.InputJsonValue { return v as Prisma.InputJsonValue; }

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function resolveOrg(projectId: string): Promise<string> {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
  if (!p) throw new Error(`Projet introuvable: ${projectId}`);
  return p.organizationId;
}

async function trackRun(jobId: string) {
  return prisma.agentRun.create({
    data: { jobId, agentType: "social_monetization", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const monetizationChannelSchema = z.object({
  channelName: z.string().trim().min(1),
  channelType: z.string().trim().min(1),
  revenueModel: z.string().trim().min(1),
  estimatedMonthlyRevenue: z.string().trim().min(1),
  implementationSteps: z.array(z.string().trim().min(1)).min(3),
  requiredResources: z.array(z.string().trim().min(1)).default([]),
  timeline: z.string().trim().min(1),
  difficulty: z.enum(["easy", "medium", "hard"])
});

const digitalProductSchema = z.object({
  productName: z.string().trim().min(1),
  productType: z.string().trim().min(1),
  price: z.string().trim().min(1),
  description: z.string().trim().min(1),
  salesPageOutline: z.string().trim().min(1),
  launchStrategy: z.string().trim().min(1)
});

const monetizationPlanSchema = z.object({
  audienceAnalysis: z.string().trim().min(1),
  monetizationStrategy: z.string().trim().min(1),
  channels: z.array(monetizationChannelSchema).min(3),
  digitalProducts: z.array(digitalProductSchema).min(2),
  revenueProjection: z.object({
    month1: z.string().trim().min(1),
    month3: z.string().trim().min(1),
    month6: z.string().trim().min(1),
    month12: z.string().trim().min(1)
  }),
  launchRoadmap: z.array(z.object({
    phase: z.string().trim().min(1),
    actions: z.array(z.string().trim().min(1)).default([]),
    timeline: z.string().trim().min(1)
  })).min(3),
  kpis: z.array(z.string().trim().min(1)).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const platforms = brief.agentDetails.platforms.join(", ") || "Instagram, YouTube";
  const channels = brief.agentDetails.monetizationChannels.join(", ") || "produits numériques, affiliation, coaching";
  return [
    `Projet: ${brief.title}`,
    `Plateformes: ${platforms}`,
    `Taille d'audience: ${brief.agentDetails.audienceSize ?? "non précisée"}`,
    `Canaux de monétisation: ${channels}`,
    `Idées de produits: ${brief.agentDetails.productIdeas.join(", ") || "aucune précisée"}`,
    `Objectif de revenus: ${brief.agentDetails.revenueTarget ?? "non précisé"}`,
    `Timeline: ${brief.agentDetails.timeline ?? "6 mois"}`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    `Messages clés: ${brief.keyMessages.join(", ") || "aucun"}`,
    "",
    "Instructions:",
    "- Génère un plan de monétisation social media complet et réaliste.",
    "- Pour chaque canal de monétisation, fournis les étapes d'implémentation concrètes.",
    "- Crée des concepts de produits numériques avec stratégie de lancement.",
    "- Les projections de revenus doivent être réalistes et basées sur les données d'audience.",
    "- La roadmap de lancement doit être chronologique et actionnable.",
    "- Inclus les KPIs à suivre pour mesurer la progression."
  ].join("\n");
}

export async function executeSocialMonetizationPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof monetizationPlanSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), monetizationPlanSchema, {
      model: MODEL, temperature: 0.7, maxOutputTokens: 4000,
      systemPrompt: "Tu es un expert en monétisation sociale et business en ligne. Tu crées des plans de monétisation complets et réalistes avec des projections de revenus et des stratégies de lancement concrètes."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["social-monetization", context.projectId, context.jobId, "monetization-plan.json"].join("/");

  const supabase = getSupabase();
  const upload = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/json", upsert: true });
  if (upload.error) throw new Error(`Upload Supabase échoué: ${upload.error.message}`);
  const signedUrl = (await supabase.storage.from(BUCKET).createSignedUrl(path, 604800)).data?.signedUrl ?? null;
  const orgId = await resolveOrg(context.projectId);

  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId, projectId: context.projectId, jobId: context.jobId,
      assetType: "document", storageBucket: BUCKET, storagePath: path,
      mimeType: "application/json", sizeBytes: BigInt(buf.byteLength),
      metadataJson: toJson({ agentType: "social_monetization", channelsCount: result.channels.length, productsCount: result.digitalProducts.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Plan de monétisation social media: ${result.channels.length} canaux, ${result.digitalProducts.length} produits numériques, roadmap ${result.launchRoadmap.length} phases.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier la cohérence des projections de revenus avec la taille d'audience",
      "Valider que les étapes d'implémentation de chaque canal sont réalistes",
      "Confirmer la diversification des canaux de monétisation",
      "Vérifier que les produits numériques correspondent aux besoins de l'audience"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "social_monetization_plan", status: "delivered", summaryText: `Plan monétisation livré: ${result.channels.length} canaux + ${result.digitalProducts.length} produits numériques.` }
  };
}

export const socialMonetizationPipeline: AgentPipeline<"social_monetization"> = {
  agentType: "social_monetization",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Analyse l'audience et identifie les opportunités de monétisation." },
    { key: "plan_generation", label: "Génération du plan", description: "Crée les canaux, produits et projections de revenus." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le plan de monétisation complet." }
  ],
  async execute(context) { return executeSocialMonetizationPipeline(context); }
};
