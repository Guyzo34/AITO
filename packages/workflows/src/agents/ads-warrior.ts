import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "ads-warrior-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"ads_warrior">;
type ParsedBrief = ParsedBriefByAgentType<"ads_warrior">;

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
    data: { jobId, agentType: "ads_warrior", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const adCreativeSchema = z.object({
  format: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  primaryText: z.string().trim().min(1),
  description: z.string().trim().min(1),
  cta: z.string().trim().min(1),
  visualDescription: z.string().trim().min(1),
  abVariant: z.enum(["A", "B"])
});

const platformCampaignSchema = z.object({
  platform: z.string().trim().min(1),
  campaignObjective: z.string().trim().min(1),
  budgetAllocation: z.string().trim().min(1),
  targetingStrategy: z.string().trim().min(1),
  audiences: z.array(z.object({
    audienceName: z.string().trim().min(1),
    audienceType: z.enum(["cold", "warm", "retargeting", "lookalike"]),
    description: z.string().trim().min(1),
    interests: z.array(z.string().trim().min(1)).default([])
  })).min(2),
  adCreatives: z.array(adCreativeSchema).min(2),
  bidStrategy: z.string().trim().min(1),
  kpis: z.array(z.string().trim().min(1)).default([])
});

const multiPlatformCampaignSchema = z.object({
  campaignTitle: z.string().trim().min(1),
  overallStrategy: z.string().trim().min(1),
  offer: z.string().trim().min(1),
  totalBudgetBreakdown: z.string().trim().min(1),
  platformCampaigns: z.array(platformCampaignSchema).min(1),
  crossPlatformSynergy: z.string().trim().min(1),
  trackingSetupGuide: z.array(z.string().trim().min(1)).default([]),
  optimizationPlaybook: z.array(z.object({
    metric: z.string().trim().min(1),
    threshold: z.string().trim().min(1),
    action: z.string().trim().min(1)
  })).default([]),
  launchChecklist: z.array(z.string().trim().min(1)).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const platforms = brief.agentDetails.platforms.join(", ") || "Facebook, Google";
  const objectives = brief.agentDetails.campaignObjectives.join(", ") || "conversions";
  return [
    `Projet: ${brief.title}`,
    `Offre/Produit: ${brief.agentDetails.offerOrProduct ?? brief.title}`,
    `Plateformes: ${platforms}`,
    `Budget total: ${brief.agentDetails.totalBudget ?? "non précisé"}`,
    `Objectifs: ${objectives}`,
    `Audience: ${brief.agentDetails.targetAudienceDetails.join(", ") || brief.targetAudience.join(", ") || "non précisée"}`,
    `Créatifs existants: ${brief.agentDetails.existingCreatives.join(", ") || "aucun"}`,
    `Analyse concurrents: ${brief.agentDetails.competitorAnalysis}`,
    `Résumé: ${brief.summary}`,
    `Messages clés: ${brief.keyMessages.join(", ") || "aucun"}`,
    `Budget: ${brief.budget ?? "non précisé"}`,
    "",
    "Instructions:",
    "- Génère une stratégie multi-plateformes complète avec campagnes détaillées.",
    "- Pour chaque plateforme: audiences segmentées (cold, warm, retargeting, lookalike), créatifs A/B, KPIs.",
    "- Les copies des annonces doivent être prêtes à l'emploi pour chaque plateforme.",
    "- Inclus un playbook d'optimisation avec seuils et actions concrètes.",
    "- Guide de setup tracking (pixels, UTM, conversions) actionnable.",
    "- La checklist de lancement doit être exhaustive et chronologique."
  ].join("\n");
}

export async function executeAdsWarriorPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof multiPlatformCampaignSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), multiPlatformCampaignSchema, {
      model: MODEL, temperature: 0.7, maxOutputTokens: 5000,
      systemPrompt: "Tu es un expert en publicité digitale multi-plateformes. Tu crées des campagnes ads complètes prêtes à lancer avec stratégie, copies, ciblage et optimisation."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["ads-warrior", context.projectId, context.jobId, "multi-platform-campaign.json"].join("/");

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
      metadataJson: toJson({ agentType: "ads_warrior", platformsCount: result.platformCampaigns.length, signedUrl })
    },
    select: { id: true }
  });

  const totalCreatives = result.platformCampaigns.reduce((sum, c) => sum + c.adCreatives.length, 0);
  return {
    summary: `Campagne multi-plateformes générée: ${result.platformCampaigns.length} plateformes, ${totalCreatives} créatifs A/B, playbook d'optimisation inclus.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier que les copies d'annonces respectent les limites de caractères par plateforme",
      "Valider la cohérence de la stratégie d'audience cross-plateforme",
      "Confirmer que le budget est réparti de façon optimale",
      "Vérifier le guide de tracking: pixels et UTM sont-ils couverts?"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "ads_warrior_campaign", status: "delivered", summaryText: `Campagne multi-plateformes livrée: ${result.platformCampaigns.length} plateformes avec ${totalCreatives} créatifs.` }
  };
}

export const adsWarriorPipeline: AgentPipeline<"ads_warrior"> = {
  agentType: "ads_warrior",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Cadre l'offre, les plateformes et les objectifs de campagne." },
    { key: "campaign_generation", label: "Génération des campagnes", description: "Crée les campagnes multi-plateformes avec copies et ciblages." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre la campagne complète avec playbook." }
  ],
  async execute(context) { return executeAdsWarriorPipeline(context); }
};
