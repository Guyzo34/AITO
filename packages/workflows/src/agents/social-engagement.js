import { parseJSON } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const BUCKET = "social-engagement-documents";
const MODEL = "gpt-5.4-mini";
function toJson(v) { return v; }
function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function resolveOrg(projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
    if (!p)
        throw new Error(`Projet introuvable: ${projectId}`);
    return p.organizationId;
}
async function trackRun(jobId) {
    return prisma.agentRun.create({
        data: { jobId, agentType: "social_engagement", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
    });
}
async function closeRun(id, status) {
    await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
const commentResponseTemplateSchema = z.object({
    commentType: z.string().trim().min(1),
    scenario: z.string().trim().min(1),
    templateA: z.string().trim().min(1),
    templateB: z.string().trim().min(1),
    templateC: z.string().trim().min(1),
    dosList: z.array(z.string().trim().min(1)).default([]),
    dontsList: z.array(z.string().trim().min(1)).default([])
});
const dmTemplateSchema = z.object({
    trigger: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    messageA: z.string().trim().min(1),
    messageB: z.string().trim().min(1),
    followUpMessage: z.string().trim().min(1),
    conversionGoal: z.string().trim().min(1)
});
const engagementKitSchema = z.object({
    engagementPersona: z.string().trim().min(1),
    brandVoiceGuide: z.string().trim().min(1),
    commentResponseTemplates: z.array(commentResponseTemplateSchema).min(5),
    dmTemplates: z.array(dmTemplateSchema).min(3),
    escalationProtocol: z.object({
        negativeCommentFlow: z.string().trim().min(1),
        crisisResponse: z.string().trim().min(1),
        escalationTriggers: z.array(z.string().trim().min(1)).default([])
    }),
    proactiveEngagementTactics: z.array(z.string().trim().min(1)).default([]),
    communityBuildingPhrases: z.array(z.string().trim().min(1)).default([])
});
function buildPrompt(brief) {
    const platforms = brief.agentDetails.platforms.join(", ") || "Instagram, Facebook";
    const commentTypes = brief.agentDetails.commentTypes.join(", ") || "positifs, négatifs, questions, DM";
    return [
        `Projet: ${brief.title}`,
        `Plateformes: ${platforms}`,
        `Types de commentaires: ${commentTypes}`,
        `Persona de réponse: ${brief.agentDetails.responsePersona ?? "professionnel et chaleureux"}`,
        `Templates DM: ${brief.agentDetails.dmTemplates}`,
        `Règles d'escalade: ${brief.agentDetails.escalationRules.join(", ") || "commentaires haineux, menaces"}`,
        `Voix de marque: ${brief.agentDetails.brandVoice ?? brief.tone ?? "authentique"}`,
        `Résumé: ${brief.summary}`,
        `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
        "",
        "Instructions:",
        "- Génère un kit complet de gestion d'engagement social media.",
        "- Pour chaque type de commentaire, fournis 3 templates de réponse distincts prêts à l'emploi.",
        "- Crée des templates DM pour tous les triggers courants (question produit, intérêt, plainte).",
        "- Le protocole d'escalade doit couvrir les scénarios de crise.",
        "- Les réponses doivent respecter la voix de marque et être naturelles.",
        "- Inclus des tactiques d'engagement proactif pour créer de la communauté."
    ].join("\n");
}
export async function executeSocialEngagementPipeline(context) {
    const brief = context.parsedBrief;
    const run = await trackRun(context.jobId);
    let result;
    try {
        result = await parseJSON(buildPrompt(brief), engagementKitSchema, {
            model: MODEL, temperature: 0.7, maxOutputTokens: 4000,
            systemPrompt: "Tu es un community manager expert. Tu crées des kits de réponse complets pour gérer l'engagement social media de façon authentique, rapide et fidèle à la voix de marque."
        });
        await closeRun(run.id, "completed");
    }
    catch (err) {
        await closeRun(run.id, "failed");
        throw err;
    }
    const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
    const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
    const path = ["social-engagement", context.projectId, context.jobId, "engagement-kit.json"].join("/");
    const supabase = getSupabase();
    const upload = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: "application/json", upsert: true });
    if (upload.error)
        throw new Error(`Upload Supabase échoué: ${upload.error.message}`);
    const signedUrl = (await supabase.storage.from(BUCKET).createSignedUrl(path, 604800)).data?.signedUrl ?? null;
    const orgId = await resolveOrg(context.projectId);
    const asset = await prisma.asset.create({
        data: {
            organizationId: orgId, projectId: context.projectId, jobId: context.jobId,
            assetType: "document", storageBucket: BUCKET, storagePath: path,
            mimeType: "application/json", sizeBytes: BigInt(buf.byteLength),
            metadataJson: toJson({ agentType: "social_engagement", commentTemplatesCount: result.commentResponseTemplates.length, dmTemplatesCount: result.dmTemplates.length, signedUrl })
        },
        select: { id: true }
    });
    return {
        summary: `Kit d'engagement social généré: ${result.commentResponseTemplates.length} types de réponses commentaires + ${result.dmTemplates.length} templates DM.`,
        outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
        qaChecklist: [
            "Vérifier que les templates de réponse respectent la voix de marque",
            "Valider que les 3 variantes de chaque template sont distinctes",
            "Confirmer que le protocole d'escalade couvre les cas critiques",
            "Vérifier que les DM sont personnalisés et non génériques"
        ],
        executionMetadata: { modelProvider: "openai", modelName: MODEL },
        delivery: { type: "social_engagement_kit", status: "delivered", summaryText: `Kit engagement livré: ${result.commentResponseTemplates.length} templates commentaires + ${result.dmTemplates.length} DM sequences.` }
    };
}
export const socialEngagementPipeline = {
    agentType: "social_engagement",
    steps: [
        { key: "brief_analysis", label: "Analyse du brief", description: "Définit la voix de marque et les scénarios d'engagement." },
        { key: "kit_generation", label: "Génération du kit", description: "Crée les templates de réponse, DM et protocoles." },
        { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le kit d'engagement complet." }
    ],
    async execute(context) { return executeSocialEngagementPipeline(context); }
};
