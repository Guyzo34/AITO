import { parseJSON } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const BUCKET = "local-growth-documents";
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
        data: { jobId, agentType: "local_growth", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
    });
}
async function closeRun(id, status) {
    await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
const gmbOptimizationSchema = z.object({
    businessDescription: z.string().trim().min(1),
    categoriesToSelect: z.array(z.string().trim().min(1)).default([]),
    attributesToActivate: z.array(z.string().trim().min(1)).default([]),
    postsCalendar: z.array(z.object({
        week: z.number().int().min(1),
        postType: z.string().trim().min(1),
        content: z.string().trim().min(1),
        cta: z.string().trim().min(1)
    })).default([]),
    reviewResponseTemplates: z.array(z.object({
        type: z.enum(["positive", "neutral", "negative"]),
        template: z.string().trim().min(1)
    })).default([])
});
const localSeoSchema = z.object({
    localKeywords: z.array(z.string().trim().min(1)).default([]),
    pageOptimizationGuide: z.string().trim().min(1),
    citationsToCreate: z.array(z.string().trim().min(1)).default([]),
    localContentIdeas: z.array(z.string().trim().min(1)).default([])
});
const localGrowthPlanSchema = z.object({
    growthStrategy: z.string().trim().min(1),
    localMarketAnalysis: z.string().trim().min(1),
    acquisitionChannels: z.array(z.object({
        channelName: z.string().trim().min(1),
        tactic: z.string().trim().min(1),
        actionPlan: z.array(z.string().trim().min(1)).default([]),
        expectedResults: z.string().trim().min(1),
        budget: z.string().trim().min(1),
        timeline: z.string().trim().min(1)
    })).min(3),
    gmbOptimization: gmbOptimizationSchema,
    localSeo: localSeoSchema,
    partnershipOpportunities: z.array(z.object({
        partnerType: z.string().trim().min(1),
        approach: z.string().trim().min(1),
        mutualBenefits: z.string().trim().min(1)
    })).default([]),
    offlineActivations: z.array(z.string().trim().min(1)).default([]),
    kpis: z.array(z.string().trim().min(1)).default([]),
    weeklyActionPlan: z.array(z.object({
        week: z.number().int().positive(),
        priority: z.string().trim().min(1),
        actions: z.array(z.string().trim().min(1)).default([])
    })).min(4)
});
function buildPrompt(brief) {
    const channels = brief.agentDetails.acquisitionChannels.join(", ") || "GMB, réseaux sociaux, bouche à oreille";
    return [
        `Projet: ${brief.title}`,
        `Type de business: ${brief.agentDetails.businessType ?? "commerce local"}`,
        `Localisation: ${brief.agentDetails.location ?? "France"}`,
        `Rayon d'action: ${brief.agentDetails.radius ?? "5km"}`,
        `Canaux d'acquisition: ${channels}`,
        `SEO local: ${brief.agentDetails.localSeoNeeded}`,
        `Google My Business: ${brief.agentDetails.googleMyBusiness}`,
        `Analyse concurrents: ${brief.agentDetails.competitorAnalysis}`,
        `Résumé: ${brief.summary}`,
        `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
        `Objectifs: ${brief.objectives.join(", ")}`,
        "",
        "Instructions:",
        "- Génère un plan d'acquisition locale complet et actionnable.",
        "- Optimisation GMB complète: description, catégories, attributs, posts calendar, réponses avis.",
        "- Stratégie SEO local avec mots-clés géolocalisés et guide d'optimisation on-page.",
        "- Plan d'action hebdomadaire sur 4+ semaines avec priorités.",
        "- Opportunités de partenariats locaux avec approche et bénéfices mutuels.",
        "- Les actions doivent être réalisables sans budget important."
    ].join("\n");
}
export async function executeLocalGrowthPipeline(context) {
    const brief = context.parsedBrief;
    const run = await trackRun(context.jobId);
    let result;
    try {
        result = await parseJSON(buildPrompt(brief), localGrowthPlanSchema, {
            model: MODEL, temperature: 0.65, maxOutputTokens: 4500,
            systemPrompt: "Tu es un expert en marketing local et SEO géolocalisé. Tu crées des plans d'acquisition locale complets avec optimisation GMB, SEO local et tactiques offline actionnables."
        });
        await closeRun(run.id, "completed");
    }
    catch (err) {
        await closeRun(run.id, "failed");
        throw err;
    }
    const doc = { metadata: { title: brief.title, location: brief.agentDetails.location, generatedAt: new Date().toISOString() }, ...result };
    const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
    const path = ["local-growth", context.projectId, context.jobId, "local-growth-plan.json"].join("/");
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
            metadataJson: toJson({ agentType: "local_growth", channelsCount: result.acquisitionChannels.length, weeksPlanned: result.weeklyActionPlan.length, signedUrl })
        },
        select: { id: true }
    });
    return {
        summary: `Plan d'acquisition locale généré: ${result.acquisitionChannels.length} canaux, optimisation GMB, SEO local, plan ${result.weeklyActionPlan.length} semaines.`,
        outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
        qaChecklist: [
            "Vérifier que les mots-clés SEO locaux sont pertinents pour la zone géographique",
            "Valider la description GMB: elle doit inclure les mots-clés locaux clés",
            "Confirmer que le plan d'action hebdomadaire est réaliste pour une petite structure",
            "Vérifier que les opportunités de partenariats sont spécifiques au secteur"
        ],
        executionMetadata: { modelProvider: "openai", modelName: MODEL },
        delivery: { type: "local_growth_plan", status: "delivered", summaryText: `Plan local growth livré: ${result.acquisitionChannels.length} canaux d'acquisition + GMB + SEO local.` }
    };
}
export const localGrowthPipeline = {
    agentType: "local_growth",
    steps: [
        { key: "brief_analysis", label: "Analyse du brief", description: "Analyse le marché local et les canaux d'acquisition potentiels." },
        { key: "plan_generation", label: "Génération du plan", description: "Crée la stratégie locale, l'optimisation GMB, le SEO local et les partenariats." },
        { key: "delivery_packaging", label: "Livraison", description: "Compile et livre le plan d'acquisition locale complet." }
    ],
    async execute(context) { return executeLocalGrowthPipeline(context); }
};
