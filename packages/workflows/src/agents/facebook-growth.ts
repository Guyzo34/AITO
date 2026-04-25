import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "facebook-growth-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"facebook_growth">;
type ParsedBrief = ParsedBriefByAgentType<"facebook_growth">;

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
    data: { jobId, agentType: "facebook_growth", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const reelScriptSchema = z.object({
  reelNumber: z.number().int().positive(),
  topic: z.string().trim().min(1),
  hook: z.string().trim().min(1),
  script: z.string().trim().min(1),
  caption: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).default([]),
  trendTip: z.string().trim().min(1)
});

const fbGrowthStrategySchema = z.object({
  pageOptimizationGuide: z.string().trim().min(1),
  contentPillars: z.array(z.object({
    pillarName: z.string().trim().min(1),
    description: z.string().trim().min(1),
    contentExamples: z.array(z.string().trim().min(1)).default([]),
    postFrequency: z.string().trim().min(1)
  })).min(3),
  organicGrowthTactics: z.array(z.object({
    tactic: z.string().trim().min(1),
    implementation: z.string().trim().min(1),
    expectedImpact: z.string().trim().min(1),
    timeline: z.string().trim().min(1)
  })).min(5),
  reelsStrategy: z.object({
    weeklyFrequency: z.number().int().positive(),
    contentAngles: z.array(z.string().trim().min(1)).default([]),
    scripts: z.array(reelScriptSchema).min(5)
  }),
  communityBuildingPlan: z.string().trim().min(1),
  milestones: z.array(z.object({
    followerCount: z.string().trim().min(1),
    timeline: z.string().trim().min(1),
    actions: z.array(z.string().trim().min(1)).default([])
  })).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  return [
    `Projet: ${brief.title}`,
    `Type de page: ${brief.agentDetails.pageType ?? "business"}`,
    `Abonnés actuels: ${brief.agentDetails.currentFollowers ?? "non précisé"}`,
    `Objectif abonnés: ${brief.agentDetails.targetFollowers ?? "non précisé"}`,
    `Types de contenu: ${brief.agentDetails.contentTypes.join(", ") || "Reels, posts, stories"}`,
    `Stratégie Reels: ${brief.agentDetails.reelsStrategy}`,
    `Tactiques d'engagement: ${brief.agentDetails.engagementTactics.join(", ") || "aucune précisée"}`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    `Ton: ${brief.tone ?? "authentique"}`,
    "",
    "Instructions:",
    "- Génère une stratégie de croissance Facebook organique complète.",
    "- Crée des piliers de contenu distincts avec exemples et fréquence.",
    "- Génère au moins 5 scripts de Reels prêts à tourner (hook + script complet + légende).",
    "- Les tactiques de croissance doivent être actionnables et avoir un impact mesuré.",
    "- Inclus un plan de milestones avec actions concrètes par palier d'abonnés.",
    "- Guide d'optimisation de la page Facebook avec toutes les sections."
  ].join("\n");
}

export async function executeFacebookGrowthPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof fbGrowthStrategySchema>;
  try {
    result = await parseJSON(buildPrompt(brief), fbGrowthStrategySchema, {
      model: MODEL, temperature: 0.75, maxOutputTokens: 4500,
      systemPrompt: "Tu es un expert Facebook/Meta croissance organique spécialisé en Reels viraux. Tu crées des stratégies de croissance complètes avec scripts prêts à tourner."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["facebook-growth", context.projectId, context.jobId, "fb-growth-strategy.json"].join("/");

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
      metadataJson: toJson({ agentType: "facebook_growth", reelsCount: result.reelsStrategy.scripts.length, tacticsCount: result.organicGrowthTactics.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Stratégie Facebook growth générée: ${result.contentPillars.length} piliers de contenu, ${result.reelsStrategy.scripts.length} scripts Reels, ${result.organicGrowthTactics.length} tactiques.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier que les scripts Reels ont un hook fort dans les 3 premières secondes",
      "Valider la diversité des piliers de contenu",
      "Confirmer que les tactiques de croissance sont adaptées au type de page",
      "Vérifier la cohérence des milestones avec l'objectif d'abonnés"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "facebook_growth_strategy", status: "delivered", summaryText: `Stratégie Facebook growth livrée: ${result.reelsStrategy.scripts.length} scripts Reels + plan de croissance organique.` }
  };
}

export const facebookGrowthPipeline: AgentPipeline<"facebook_growth"> = {
  agentType: "facebook_growth",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Analyse la page et définit les piliers de contenu." },
    { key: "strategy_generation", label: "Génération de la stratégie", description: "Crée les scripts Reels, tactiques de croissance et milestones." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre la stratégie Facebook growth complète." }
  ],
  async execute(context) { return executeFacebookGrowthPipeline(context); }
};
