import { parseJSON } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const BUCKET = "funnel-builder-documents";
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
        data: { jobId, agentType: "funnel_builder", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
    });
}
async function closeRun(id, status) {
    await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
const funnelStageSchema = z.object({
    stageName: z.string().trim().min(1),
    stageType: z.enum(["awareness", "interest", "decision", "action", "retention"]),
    pageTitle: z.string().trim().min(1),
    headline: z.string().trim().min(1),
    subheadline: z.string().trim().min(1),
    bodyContent: z.string().trim().min(1),
    ctaText: z.string().trim().min(1),
    ctaUrl: z.string().trim().min(1),
    conversionGoal: z.string().trim().min(1),
    visualRecommendation: z.string().trim().min(1)
});
const emailSequenceSchema = z.object({
    emailNumber: z.number().int().positive(),
    subject: z.string().trim().min(1),
    preheader: z.string().trim().min(1),
    bodyText: z.string().trim().min(1),
    ctaText: z.string().trim().min(1),
    sendTiming: z.string().trim().min(1)
});
const funnelDocumentSchema = z.object({
    funnelTitle: z.string().trim().min(1),
    funnelStrategy: z.string().trim().min(1),
    targetPersona: z.string().trim().min(1),
    mainOffer: z.string().trim().min(1),
    stages: z.array(funnelStageSchema).min(2),
    emailSequence: z.array(emailSequenceSchema).min(3),
    kpis: z.array(z.string().trim().min(1)).default([]),
    optimizationTips: z.array(z.string().trim().min(1)).default([])
});
function buildPrompt(brief) {
    const offer = brief.agentDetails.offer ?? brief.title;
    const stages = brief.agentDetails.stages.join(", ") || "Awareness, Interest, Decision, Action";
    const traffic = brief.agentDetails.trafficSource.join(", ") || "publicité payante";
    return [
        `Offre: ${offer}`,
        `Type de funnel: ${brief.agentDetails.funnelType ?? "vente directe"}`,
        `Étapes: ${stages}`,
        `CTA principal: ${brief.agentDetails.primaryCta ?? "Acheter maintenant"}`,
        `Objectif de conversion: ${brief.agentDetails.conversionGoal ?? "vente"}`,
        `Source de trafic: ${traffic}`,
        `Assets existants: ${brief.agentDetails.existingAssets.join(", ") || "aucun"}`,
        `Résumé: ${brief.summary}`,
        `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
        `Messages clés: ${brief.keyMessages.join(", ") || "aucun"}`,
        "",
        "Instructions:",
        "- Génère un funnel de conversion complet page par page avec tous les textes.",
        "- Chaque étape doit avoir: titre de page, headline, sous-headline, corps du texte, CTA.",
        "- Crée une séquence email de suivi (minimum 5 emails) avec sujets et textes complets.",
        "- Les textes doivent être prêts à l'emploi, sans placeholder ni crochets.",
        "- Inclus des KPIs à suivre et des conseils d'optimisation CRO."
    ].join("\n");
}
export async function executeFunnelBuilderPipeline(context) {
    const brief = context.parsedBrief;
    const run = await trackRun(context.jobId);
    let result;
    try {
        result = await parseJSON(buildPrompt(brief), funnelDocumentSchema, {
            model: MODEL, temperature: 0.7, maxOutputTokens: 4000,
            systemPrompt: "Tu es un expert en optimisation de taux de conversion (CRO) et copywriting de funnels. Tu crées des funnels complets prêts à déployer avec tous les textes et séquences email."
        });
        await closeRun(run.id, "completed");
    }
    catch (err) {
        await closeRun(run.id, "failed");
        throw err;
    }
    const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
    const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
    const path = ["funnel-builder", context.projectId, context.jobId, "funnel-document.json"].join("/");
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
            metadataJson: toJson({ agentType: "funnel_builder", stagesCount: result.stages.length, emailsCount: result.emailSequence.length, signedUrl })
        },
        select: { id: true }
    });
    return {
        summary: `Funnel de conversion créé: ${result.stages.length} étapes + séquence de ${result.emailSequence.length} emails.`,
        outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
        qaChecklist: [
            "Vérifier la cohérence des textes entre chaque étape du funnel",
            "Valider que les CTAs sont spécifiques et orientés action",
            "Vérifier la progression logique de la séquence email",
            "Confirmer que tous les textes sont prêts à l'emploi sans placeholder"
        ],
        executionMetadata: { modelProvider: "openai", modelName: MODEL },
        delivery: { type: "funnel_document", status: "delivered", summaryText: `Funnel complet livré: ${result.stages.length} pages + ${result.emailSequence.length} emails de suivi.` }
    };
}
export const funnelBuilderPipeline = {
    agentType: "funnel_builder",
    steps: [
        { key: "brief_analysis", label: "Analyse du brief", description: "Cadre l'offre, les étapes du funnel et les objectifs de conversion." },
        { key: "funnel_generation", label: "Génération du funnel", description: "Crée toutes les pages, textes et la séquence email." },
        { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le document funnel complet." }
    ],
    async execute(context) { return executeFunnelBuilderPipeline(context); }
};
