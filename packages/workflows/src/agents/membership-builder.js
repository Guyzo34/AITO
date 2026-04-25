import { parseJSON } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const BUCKET = "membership-builder-documents";
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
        data: { jobId, agentType: "membership_builder", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
    });
}
async function closeRun(id, status) {
    await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
const membershipTierSchema = z.object({
    tierName: z.string().trim().min(1),
    price: z.string().trim().min(1),
    billingCycle: z.enum(["monthly", "annually", "lifetime"]),
    targetPersona: z.string().trim().min(1),
    benefits: z.array(z.string().trim().min(1)).min(3),
    exclusiveContent: z.array(z.string().trim().min(1)).default([]),
    communityAccess: z.string().trim().min(1),
    salesPageHeadline: z.string().trim().min(1),
    salesPagePitch: z.string().trim().min(1)
});
const onboardingEmailSchema = z.object({
    emailNumber: z.number().int().positive(),
    subject: z.string().trim().min(1),
    sendTiming: z.string().trim().min(1),
    bodyText: z.string().trim().min(1),
    goal: z.string().trim().min(1)
});
const membershipSpaceSchema = z.object({
    membershipTitle: z.string().trim().min(1),
    valueProposition: z.string().trim().min(1),
    targetAudienceDescription: z.string().trim().min(1),
    tiers: z.array(membershipTierSchema).min(1),
    contentCurriculum: z.array(z.object({
        moduleName: z.string().trim().min(1),
        description: z.string().trim().min(1),
        contentItems: z.array(z.string().trim().min(1)).default([]),
        accessLevel: z.string().trim().min(1)
    })).min(3),
    onboardingSequence: z.array(onboardingEmailSchema).min(5),
    communityRules: z.array(z.string().trim().min(1)).default([]),
    retentionMechanisms: z.array(z.string().trim().min(1)).default([]),
    launchStrategy: z.string().trim().min(1),
    platformSetupGuide: z.array(z.string().trim().min(1)).default([])
});
function buildPrompt(brief) {
    const tiers = brief.agentDetails.membershipTiers.join(", ") || "Starter, Pro, VIP";
    const contentTypes = brief.agentDetails.contentTypes.join(", ") || "vidéos, guides, templates";
    const community = brief.agentDetails.communityFeatures.join(", ") || "forum, sessions live, Discord";
    return [
        `Projet: ${brief.title}`,
        `Tiers d'accès: ${tiers}`,
        `Types de contenu: ${contentTypes}`,
        `Modèle tarifaire: ${brief.agentDetails.pricingModel ?? "mensuel/annuel"}`,
        `Plateforme: ${brief.agentDetails.platform ?? "MemberSpace/Podia"}`,
        `Flux d'onboarding: ${brief.agentDetails.onboardingFlow}`,
        `Fonctionnalités communauté: ${community}`,
        `Résumé: ${brief.summary}`,
        `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
        `Messages clés: ${brief.keyMessages.join(", ") || "aucun"}`,
        "",
        "Instructions:",
        "- Génère un espace membre complet prêt à lancer.",
        "- Chaque tier doit avoir: prix, bénéfices détaillés, contenu exclusif, argumentaire de vente.",
        "- Crée un curriculum de contenu structuré en modules.",
        "- Séquence d'onboarding de 5+ emails avec objectifs clairs.",
        "- Inclus règles communautaires et mécanismes de rétention.",
        "- La stratégie de lancement doit inclure pre-launch et early birds."
    ].join("\n");
}
export async function executeMembershipBuilderPipeline(context) {
    const brief = context.parsedBrief;
    const run = await trackRun(context.jobId);
    let result;
    try {
        result = await parseJSON(buildPrompt(brief), membershipSpaceSchema, {
            model: MODEL, temperature: 0.7, maxOutputTokens: 5000,
            systemPrompt: "Tu es un expert en création d'espaces membres et business en ligne. Tu crées des membership spaces complets avec curriculum, onboarding et stratégie de rétention prêts à lancer."
        });
        await closeRun(run.id, "completed");
    }
    catch (err) {
        await closeRun(run.id, "failed");
        throw err;
    }
    await prisma.membershipPlan.create({
        data: {
            projectId: context.projectId,
            jobId: context.jobId,
            planName: result.membershipTitle,
            plansJson: toJson(result.tiers),
            onboardingJson: toJson(result.onboardingSequence)
        }
    });
    const doc = { metadata: { title: brief.title, generatedAt: new Date().toISOString() }, ...result };
    const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
    const path = ["membership-builder", context.projectId, context.jobId, "membership-space.json"].join("/");
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
            metadataJson: toJson({ agentType: "membership_builder", tiersCount: result.tiers.length, modulesCount: result.contentCurriculum.length, signedUrl })
        },
        select: { id: true }
    });
    return {
        summary: `Espace membre créé: ${result.tiers.length} tiers, ${result.contentCurriculum.length} modules, séquence d'onboarding ${result.onboardingSequence.length} emails.`,
        outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
        qaChecklist: [
            "Vérifier que chaque tier a une valeur perçue claire et différenciante",
            "Valider la progression logique du curriculum en modules",
            "Confirmer que la séquence d'onboarding crée de l'engagement dès J1",
            "Vérifier que les argumentaires de vente par tier sont convaincants"
        ],
        executionMetadata: { modelProvider: "openai", modelName: MODEL },
        delivery: { type: "membership_space", status: "delivered", summaryText: `Espace membre livré: ${result.tiers.length} tiers + ${result.contentCurriculum.length} modules + onboarding ${result.onboardingSequence.length} emails.` }
    };
}
export const membershipBuilderPipeline = {
    agentType: "membership_builder",
    steps: [
        { key: "brief_analysis", label: "Analyse du brief", description: "Définit la structure des tiers et le curriculum." },
        { key: "space_generation", label: "Génération de l'espace", description: "Crée les tiers, le curriculum, l'onboarding et les mécanismes de rétention." },
        { key: "delivery_packaging", label: "Livraison", description: "Stocke en DB et livre l'espace membre complet." }
    ],
    async execute(context) { return executeMembershipBuilderPipeline(context); }
};
