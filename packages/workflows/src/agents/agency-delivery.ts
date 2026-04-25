import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "agency-delivery-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"agency_delivery">;
type ParsedBrief = ParsedBriefByAgentType<"agency_delivery">;

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
    data: { jobId, agentType: "agency_delivery", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const deliverableItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  format: z.string().trim().min(1),
  status: z.enum(["delivered", "pending_review", "in_progress"]),
  instructions: z.string().trim().min(1)
});

const agencyPackageSchema = z.object({
  packageTitle: z.string().trim().min(1),
  executiveSummary: z.string().trim().min(1),
  projectScope: z.string().trim().min(1),
  deliverables: z.array(deliverableItemSchema).min(1),
  usageGuide: z.string().trim().min(1),
  nextStepsRecommendations: z.array(z.string().trim().min(1)).default([]),
  clientPresentationNarrative: z.string().trim().min(1),
  invoiceLineItems: z.array(z.object({
    description: z.string().trim().min(1),
    quantity: z.string().trim().min(1),
    unitPrice: z.string().trim().min(1)
  })).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const deliverables = brief.agentDetails.deliverables.join(", ") || brief.deliverables.join(", ") || "à définir";
  return [
    `Client: ${brief.agentDetails.clientName ?? brief.title}`,
    `Périmètre du projet: ${brief.agentDetails.projectScope ?? brief.summary}`,
    `Livrables: ${deliverables}`,
    `Branding inclus: ${brief.agentDetails.brandingIncluded}`,
    `Format du rapport: ${brief.agentDetails.reportFormat ?? "PDF professionnel"}`,
    `Style de présentation: ${brief.agentDetails.presentationStyle ?? "professionnel et synthétique"}`,
    `Résumé: ${brief.summary}`,
    `Objectifs: ${brief.objectives.join(", ")}`,
    "",
    "Instructions:",
    "- Génère un pack de livraison agence professionnel complet.",
    "- Inclus un executive summary percutant, un guide d'utilisation des livrables.",
    "- Crée une narrative de présentation client prête à l'oral.",
    "- Génère des lignes de facturation claires et détaillées.",
    "- Les recommandations de prochaines étapes doivent être actionnables et convaincantes.",
    "- Le ton doit être professionnel et valoriser le travail réalisé."
  ].join("\n");
}

export async function executeAgencyDeliveryPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof agencyPackageSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), agencyPackageSchema, {
      model: MODEL, temperature: 0.6, maxOutputTokens: 3500,
      systemPrompt: "Tu es un consultant senior en agence marketing. Tu crées des packs de livraison client professionnels, valorisants et complets qui renforcent la relation client."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { clientName: brief.agentDetails.clientName, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["agency-delivery", context.projectId, context.jobId, "delivery-package.json"].join("/");

  const supabase = getSupabase();
  const upload = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/json", upsert: true });
  if (upload.error) throw new Error(`Upload Supabase échoué: ${upload.error.message}`);
  const signedUrl = (await supabase.storage.from(BUCKET).createSignedUrl(path, 604800)).data?.signedUrl ?? null;
  const orgId = await resolveOrg(context.projectId);

  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId, projectId: context.projectId, jobId: context.jobId,
      assetType: "delivery_pack", storageBucket: BUCKET, storagePath: path,
      mimeType: "application/json", sizeBytes: BigInt(buf.byteLength),
      metadataJson: toJson({ agentType: "agency_delivery", deliverablesCount: result.deliverables.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Pack de livraison agence généré: ${result.deliverables.length} livrables documentés avec guide client.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier que tous les livrables sont correctement décrits et instruits",
      "Valider l'executive summary: il doit valoriser la valeur créée",
      "Vérifier la cohérence des lignes de facturation",
      "Confirmer que la narrative de présentation est adaptée au client"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "agency_delivery_pack", status: "delivered", summaryText: `Pack livraison agence complet: ${result.deliverables.length} livrables avec guide et narrative client.` }
  };
}

export const agencyDeliveryPipeline: AgentPipeline<"agency_delivery"> = {
  agentType: "agency_delivery",
  steps: [
    { key: "brief_analysis", label: "Analyse du projet", description: "Identifie les livrables et le périmètre client." },
    { key: "package_generation", label: "Génération du pack", description: "Crée le pack de livraison professionnel complet." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le pack client." }
  ],
  async execute(context) { return executeAgencyDeliveryPipeline(context); }
};
