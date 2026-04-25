import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

const BUCKET = "social-automation-documents";
const MODEL = "gpt-5.4-mini";

type Context = AgentPipelineContext<"social_automation">;
type ParsedBrief = ParsedBriefByAgentType<"social_automation">;

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
    data: { jobId, agentType: "social_automation", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
  });
}
async function closeRun(id: string, status: "completed" | "failed") {
  await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const socialPostSchema = z.object({
  day: z.number().int().min(1).max(31),
  dayOfWeek: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  postType: z.enum(["educational", "promotional", "entertainment", "engagement", "reels", "stories", "carousel"]),
  hook: z.string().trim().min(1),
  caption: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).default([]),
  bestTime: z.string().trim().min(1),
  visualDescription: z.string().trim().min(1),
  cta: z.string().trim().min(1)
});

const calendarDocumentSchema = z.object({
  calendarTitle: z.string().trim().min(1),
  contentStrategy: z.string().trim().min(1),
  contentMixRationale: z.string().trim().min(1),
  posts: z.array(socialPostSchema).min(20),
  hashtagBanks: z.record(z.string(), z.array(z.string().trim().min(1))).default({}),
  bestPostingTimesGuide: z.string().trim().min(1),
  automationTools: z.array(z.string().trim().min(1)).default([])
});

function buildPrompt(brief: ParsedBrief): string {
  const platforms = brief.agentDetails.platforms.join(", ") || "Instagram, Facebook";
  const contentMix = brief.agentDetails.contentMix.join(", ") || "40% éducatif, 30% divertissement, 20% promotionnel, 10% engagement";
  return [
    `Projet: ${brief.title}`,
    `Plateformes: ${platforms}`,
    `Fréquence: ${brief.agentDetails.postFrequency ?? "1 post/jour"}`,
    `Mix de contenu: ${contentMix}`,
    `Stratégie hashtags: ${brief.agentDetails.hashtagStrategy}`,
    `Meilleurs horaires: ${brief.agentDetails.bestPostingTimes}`,
    `Durée: ${brief.agentDetails.calendarDays} jours`,
    `Résumé: ${brief.summary}`,
    `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
    `Ton: ${brief.tone ?? "authentique et professionnel"}`,
    `Messages clés: ${brief.keyMessages.join(", ") || "aucun"}`,
    "",
    "Instructions:",
    `- Génère un calendrier éditorial de ${brief.agentDetails.calendarDays} jours avec des posts variés.`,
    "- Chaque post doit avoir: hook accrocheur, caption complète prête à publier, hashtags, horaire optimal.",
    "- Varie les types de contenu: éducatif, divertissement, promotionnel, engagement, Reels.",
    "- Les captions doivent être prêtes à copier-coller, sans placeholder.",
    "- Génère des banques de hashtags par thématique.",
    "- Inclus un guide des meilleurs horaires par plateforme."
  ].join("\n");
}

export async function executeSocialAutomationPipeline(context: Context): Promise<AgentPipelineResult> {
  const brief = context.parsedBrief;
  const now = new Date();

  const run = await trackRun(context.jobId);
  let result: z.infer<typeof calendarDocumentSchema>;
  try {
    result = await parseJSON(buildPrompt(brief), calendarDocumentSchema, {
      model: MODEL, temperature: 0.75, maxOutputTokens: 5000,
      systemPrompt: "Tu es un social media manager expert. Tu crées des calendriers éditoriaux complets et variés avec des contenus prêts à publier sur toutes les plateformes."
    });
    await closeRun(run.id, "completed");
  } catch (err) {
    await closeRun(run.id, "failed");
    throw err;
  }

  const platforms = brief.agentDetails.platforms;
  for (const platform of (platforms.length > 0 ? platforms : ["social"])) {
    await prisma.socialCalendar.create({
      data: {
        projectId: context.projectId,
        jobId: context.jobId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        platform,
        postsJson: toJson(result.posts.filter(p => p.platform.toLowerCase().includes(platform.toLowerCase()))),
        hashtagsJson: toJson(result.hashtagBanks)
      }
    });
  }

  const doc = { metadata: { title: brief.title, generatedAt: now.toISOString() }, ...result };
  const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
  const path = ["social-automation", context.projectId, context.jobId, "editorial-calendar.json"].join("/");

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
      metadataJson: toJson({ agentType: "social_automation", postsCount: result.posts.length, signedUrl })
    },
    select: { id: true }
  });

  return {
    summary: `Calendrier éditorial 30 jours généré: ${result.posts.length} posts prêts à publier sur ${brief.agentDetails.platforms.join(", ")}.`,
    outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
    qaChecklist: [
      "Vérifier la variété des types de contenu sur les 30 jours",
      "Valider que toutes les captions sont prêtes sans placeholder",
      "Confirmer la cohérence du ton avec la marque",
      "Vérifier la pertinence des hashtags pour l'audience cible"
    ],
    executionMetadata: { modelProvider: "openai", modelName: MODEL },
    delivery: { type: "social_editorial_calendar", status: "delivered", summaryText: `Calendrier éditorial livré: ${result.posts.length} posts sur ${brief.agentDetails.calendarDays} jours.` }
  };
}

export const socialAutomationPipeline: AgentPipeline<"social_automation"> = {
  agentType: "social_automation",
  steps: [
    { key: "brief_analysis", label: "Analyse du brief", description: "Cadre la stratégie de contenu et le mix éditorial." },
    { key: "calendar_generation", label: "Génération du calendrier", description: "Crée les 30 posts avec captions, hashtags et horaires." },
    { key: "delivery_packaging", label: "Livraison", description: "Stocke le calendrier en DB et livre le document complet." }
  ],
  async execute(context) { return executeSocialAutomationPipeline(context); }
};
