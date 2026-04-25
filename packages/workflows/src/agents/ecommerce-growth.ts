import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "ecommerce-growth-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"ecommerce_growth">;
type ParsedBrief = ParsedBriefByAgentType<"ecommerce_growth">;

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
    data: { jobId, agentType: "ecommerce_growth", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productFicheSchema = z.object({
  productName: z.string().trim().min(1),
  seoTitle: z.string().trim().min(1),
  metaDescription: z.string().trim().min(1),
  h1: z.string().trim().min(1),
  descriptionHtml: z.string().trim().min(1),
  bulletPoints: z.array(z.string().trim().min(1)).min(3),
  keywords: z.array(z.string().trim().min(1)).default([]),
  structuredDataType: z.string().trim().min(1)
});

const growthStrategySchema = z.object({
  revenueAnalysis: z.string().trim().min(1),
  growthLeversAnalysis: z.array(z.object({
    lever: z.string().trim().min(1),
    potential: z.enum(["high", "medium", "low"]),
    actionPlan: z.string().trim().min(1),
    timeline: z.string().trim().min(1)
  })).min(3),
  productFiches: z.array(productFicheSchema).min(1),
  emailRetentionCampaigns: z.array(z.object({
    campaignName: z.string().trim().min(1),
    trigger: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    objective: z.string().trim().min(1)
  })).default([]),
  conversionOptimizationPlan: z.array(z.string().trim().min(1)).default([]),
  quickWins: z.array(z.string().trim().min(1)).min(3)
});

function buildProductFichesPrompt(brief: ParsedBrief): string {
  const products = brief.agentDetails.products.join(", ") || brief.title;
  const keywords = brief.agentDetails.targetKeywords.join(", ") || "à identifier";
  return [
    `Produits: ${products}`,
    `Mots-clés cibles: ${keywords}`,
    `Concurrents: ${brief.agentDetails.competitorUrls.join(", ") || "non précisés"}`,
    `Levers de croissance: ${brief.agentDetails.growthLevers.join(", ") || "SEO, conversion, rétention"}`,
    `CA actuel: ${brief.agentDetails.currentRevenue ?? "non précisé"}`,
    `CA cible: ${brief.agentDetails.targetRevenue ?? "non précisé"}`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    "",
    "Instructions:",
    "- Génère des fiches produits SEO complètes pour chaque produit.",
    "- Inclus titre SEO, meta description, H1, description HTML richement formatée et bullet points.",
    "- Analyse les leviers de croissance avec plan d'action et timeline.",
    "- Génère des campagnes email de rétention (abandon panier, win-back, upsell).",
    "- Fournis un plan d'optimisation CRO et les quick wins prioritaires.",
    "- Les fiches produits doivent être prêtes à copier-coller dans la boutique."
  ].join("\n");
}

export async function executeEcommerceGrowthPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof growthStrategySchema>;
  try {
    result = await parseJSON(buildProductFichesPrompt(brief), growthStrategySchema, {
      model: MODEL, temperature: 0.65, maxOutputTokens: 4500,
      systemPrompt: "Tu es un expert e-commerce growth hacker. Tu crées des fiches produits SEO optimisées et des stratégies de croissance actionnables avec KPIs et plans d'action concrets."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["ecommerce-growth", context.projectId, context.jobId, "growth-strategy.json"].join("/");

  const supabase = getSupabase();
  const upload = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/json", upsert: true });
  if (upload.error) throw new Error(`Upload Supabase échoué: ${upload.error.message}`);
  const signedUrl = (await supabase.storage.from(BUCKET).createSignedUrl(path, 604800)).data?.signedUrl ?? null;
  const orgId = await resolveOrg(context.projectId);

  await prisma.productCatalog.create({
    data: {
      projectId: context.projectId,
      jobId: context.jobId,
      catalogName: brief.title,
      productsJson: toJson(result.productFiches),
      seoSummaryJson: toJson({ growthLevers: result.growthLeversAnalysis, quickWins: result.quickWins })
    }
  });

  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId, projectId: context.projectId, jobId: context.jobId,
      assetType: "document", storageBucket: BUCKET, storagePath: path,
      mimeType: "application/json", sizeBytes: BigInt(buf.byteLength),
      metadataJson: toJson({ agentType: "ecommerce_growth", productsCount: result.productFiches.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Stratégie e-commerce growth générée: ${result.productFiches.length} fiches produits SEO + ${result.growthLeversAnalysis.length} leviers de croissance.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier la qualité SEO des fiches produits: title < 60 chars, meta < 160 chars",
      "Valider que les bullet points mettent en avant les bénéfices clés",
      "Vérifier la pertinence des leviers de croissance pour le contexte",
      "Confirmer que les quick wins sont vraiment rapides à implémenter"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "ecommerce_growth_strategy", status: "delivered", summaryText: `Stratégie croissance e-commerce: ${result.productFiches.length} fiches SEO + plan de croissance complet.` }
  };
}

export const ecommerceGrowthPipeline: AgentPipeline<"ecommerce_growth"> = {
  agentType: "ecommerce_growth",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Identifie les produits, mots-clés et leviers de croissance." },
    { key: "fiches_generation", label: "Génération des fiches SEO", description: "Crée les fiches produits optimisées et la stratégie de croissance." },
    { key: "delivery_packaging", label: "Livraison", description: "Stocke les fiches en DB et livre le document complet." }
  ],
  async execute(context) { return executeEcommerceGrowthPipeline(context); }
};
