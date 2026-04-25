import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "crm-loyalty-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"crm_loyalty">;
type ParsedBrief = ParsedBriefByAgentType<"crm_loyalty">;

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
    data: { jobId, agentType: "crm_loyalty", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailAutomationFlowSchema = z.object({
  flowName: z.string().trim().min(1),
  trigger: z.string().trim().min(1),
  emails: z.array(z.object({
    position: z.number().int().positive(),
    sendDelay: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    preheader: z.string().trim().min(1),
    bodyText: z.string().trim().min(1),
    cta: z.string().trim().min(1),
    goal: z.string().trim().min(1)
  })).min(2)
});

const loyaltyProgramSchema = z.object({
  programName: z.string().trim().min(1),
  programType: z.string().trim().min(1),
  rewardStructure: z.string().trim().min(1),
  tiers: z.array(z.object({
    tierName: z.string().trim().min(1),
    threshold: z.string().trim().min(1),
    benefits: z.array(z.string().trim().min(1)).default([]),
    exclusivePerks: z.array(z.string().trim().min(1)).default([])
  })).min(2),
  pointsSystem: z.string().trim().min(1),
  referralProgram: z.string().trim().min(1)
});

const crmLoyaltyPlanSchema = z.object({
  retentionStrategy: z.string().trim().min(1),
  segmentationModel: z.string().trim().min(1),
  customerSegments: z.array(z.object({
    segmentName: z.string().trim().min(1),
    criteria: z.string().trim().min(1),
    retentionTactics: z.array(z.string().trim().min(1)).default([]),
    communicationCadence: z.string().trim().min(1)
  })).min(3),
  loyaltyProgram: loyaltyProgramSchema,
  automationFlows: z.array(emailAutomationFlowSchema).min(3),
  winBackCampaign: z.object({
    targetSegment: z.string().trim().min(1),
    offer: z.string().trim().min(1),
    emailSequence: z.array(z.object({
      subject: z.string().trim().min(1),
      bodyText: z.string().trim().min(1),
      sendTiming: z.string().trim().min(1)
    })).min(3)
  }),
  kpis: z.array(z.string().trim().min(1)).default([]),
  implementationRoadmap: z.array(z.string().trim().min(1)).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const segments = brief.agentDetails.customerSegments.join(", ") || "VIP, réguliers, inactifs";
  const rewards = brief.agentDetails.rewardMechanisms.join(", ") || "points, remises, accès exclusif";
  const triggers = brief.agentDetails.automationTriggers.join(", ") || "achat, anniversaire, inactivité";
  return [
    `Projet: ${brief.title}`,
    `Type de programme: ${brief.agentDetails.programType ?? "fidélité"}`,
    `Segments clients: ${segments}`,
    `Mécaniques de récompense: ${rewards}`,
    `Déclencheurs automation: ${triggers}`,
    `Objectif rétention: ${brief.agentDetails.retentionGoal ?? "réduire le churn de 20%"}`,
    `Taux de churn actuel: ${brief.agentDetails.currentChurnRate ?? "non précisé"}`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    "",
    "Instructions:",
    "- Génère un programme CRM et fidélité complet avec structure de tiers.",
    "- Crée des flows d'automation email (onboarding, post-achat, win-back, anniversaire).",
    "- Chaque email doit avoir: objet, préheader, corps complet, CTA.",
    "- La campagne win-back doit avoir une séquence de 3+ emails.",
    "- Le modèle de segmentation doit être basé sur la valeur client (RFM ou similaire).",
    "- Les KPIs et la roadmap d'implémentation doivent être actionnables."
  ].join("\n");
}

export async function executeCrmLoyaltyPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof crmLoyaltyPlanSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), crmLoyaltyPlanSchema, {
      model: MODEL, temperature: 0.65, maxOutputTokens: 5000,
      systemPrompt: "Tu es un expert CRM et marketing de rétention. Tu crées des programmes de fidélité complets avec automations email, segmentation et stratégies de win-back prêts à déployer."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["crm-loyalty", context.projectId, context.jobId, "crm-loyalty-plan.json"].join("/");

  const supabase = getSupabase();
  const upload = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/json", upsert: true });
  if (upload.error) throw new Error(`Upload Supabase échoué: ${upload.error.message}`);
  const signedUrl = (await supabase.storage.from(BUCKET).createSignedUrl(path, 604800)).data?.signedUrl ?? null;
  const orgId = await resolveOrg(context.projectId);

  const totalEmails = result.automationFlows.reduce((sum, f) => sum + f.emails.length, 0);
  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId, projectId: context.projectId, jobId: context.jobId,
      assetType: "document", storageBucket: BUCKET, storagePath: path,
      mimeType: "application/json", sizeBytes: BigInt(buf.byteLength),
      metadataJson: toJson({ agentType: "crm_loyalty", flowsCount: result.automationFlows.length, emailsCount: totalEmails, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Programme CRM & fidélité généré: ${result.loyaltyProgram.tiers.length} tiers, ${result.automationFlows.length} flows automation, ${totalEmails} emails.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier que les tiers de fidélité sont attrayants et progressifs",
      "Valider que les flows d'automation couvrent tous les moments clés du parcours",
      "Confirmer que la campagne win-back a une offre suffisamment incitative",
      "Vérifier que le modèle de segmentation est applicable avec les données disponibles"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "crm_loyalty_plan", status: "delivered", summaryText: `Programme CRM livré: programme de fidélité ${result.loyaltyProgram.tiers.length} tiers + ${result.automationFlows.length} automations email.` }
  };
}

export const crmLoyaltyPipeline: AgentPipeline<"crm_loyalty"> = {
  agentType: "crm_loyalty",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Analyse les segments clients et les objectifs de rétention." },
    { key: "program_generation", label: "Génération du programme", description: "Crée le programme de fidélité, les flows email et la stratégie de segmentation." },
    { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le plan CRM et fidélité complet." }
  ],
  async execute(context) { return executeCrmLoyaltyPipeline(context); }
};
