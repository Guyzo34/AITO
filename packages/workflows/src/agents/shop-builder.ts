import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "shop-builder-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"shop_builder">;
type ParsedBrief = ParsedBriefByAgentType<"shop_builder">;

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
    data: { jobId, agentType: "shop_builder", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const shopPageSchema = z.object({
  pageName: z.string().trim().min(1),
  purpose: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  sections: z.array(z.string().trim().min(1)).default([]),
  conversionElements: z.array(z.string().trim().min(1)).default([])
});

const shopStructureSchema = z.object({
  shopName: z.string().trim().min(1),
  shopConcept: z.string().trim().min(1),
  categoryStructure: z.array(z.object({
    categoryName: z.string().trim().min(1),
    subcategories: z.array(z.string().trim().min(1)).default([]),
    productCount: z.string().trim().min(1)
  })).default([]),
  pages: z.array(shopPageSchema).min(3),
  checkoutFlow: z.array(z.string().trim().min(1)).default([]),
  trustElements: z.array(z.string().trim().min(1)).default([]),
  upsellStrategy: z.string().trim().min(1),
  technicalSetupGuide: z.array(z.string().trim().min(1)).default([]),
  launchChecklist: z.array(z.string().trim().min(1)).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const categories = brief.agentDetails.categories.join(", ") || "à définir";
  const payments = brief.agentDetails.paymentMethods.join(", ") || "Carte, PayPal, Virement";
  return [
    `Projet: ${brief.title}`,
    `Type de boutique: ${brief.agentDetails.shopType ?? "généraliste"}`,
    `Nombre de produits: ${brief.agentDetails.productCount ?? "variable"}`,
    `Catégories: ${categories}`,
    `Méthodes de paiement: ${payments}`,
    `Zones de livraison: ${brief.agentDetails.shippingZones.join(", ") || "France"}`,
    `Plateforme: ${brief.agentDetails.technicalPlatform ?? "Shopify/WooCommerce"}`,
    `Optimisation conversion: ${brief.agentDetails.conversionOptimization}`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    "",
    "Instructions:",
    "- Génère une structure de boutique e-commerce complète et optimisée.",
    "- Crée l'architecture des catégories, les pages clés avec leurs contenus.",
    "- Inclus un flux de checkout optimisé pour réduire l'abandon panier.",
    "- Fournis des éléments de réassurance (trust badges, avis, garanties).",
    "- Génère une stratégie d'upsell/cross-sell intégrée.",
    "- La checklist de lancement doit être actionnable et chronologique."
  ].join("\n");
}

export async function executeShopBuilderPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof shopStructureSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), shopStructureSchema, {
      model: MODEL, temperature: 0.65, maxOutputTokens: 3500,
      systemPrompt: "Tu es un expert e-commerce spécialisé en architecture de boutique et optimisation de conversion. Tu crées des structures de shop complètes, prêtes à déployer."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, platform: brief.agentDetails.technicalPlatform, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["shop-builder", context.projectId, context.jobId, "shop-structure.json"].join("/");

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
      metadataJson: toJson({ agentType: "shop_builder", pagesCount: result.pages.length, categoriesCount: result.categoryStructure.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Structure de boutique générée: ${result.pages.length} pages, ${result.categoryStructure.length} catégories, checklist de lancement incluse.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier la cohérence de l'architecture des catégories",
      "Valider le flux de checkout: chaque étape est-elle optimisée?",
      "Confirmer les éléments de réassurance pour le marché cible",
      "Vérifier la checklist de lancement: est-elle complète et ordonnée?"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "shop_structure_document", status: "delivered", summaryText: `Structure boutique e-commerce livrée: ${result.pages.length} pages + guide de setup technique.` }
  };
}

export const shopBuilderPipeline: AgentPipeline<"shop_builder"> = {
  agentType: "shop_builder",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Cadre le type de boutique, les catégories et les contraintes techniques." },
    { key: "structure_generation", label: "Génération de la structure", description: "Crée l'architecture complète de la boutique avec pages et contenus." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre la structure complète de la boutique." }
  ],
  async execute(context) { return executeShopBuilderPipeline(context); }
};
