import { parseJSON } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const BUCKET = "website-multilang-documents";
const MODEL = "gpt-5.4-mini";
function toJson(v) {
    return v;
}
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
        data: { jobId, agentType: "website_multilang", modelProvider: "openai", modelName: MODEL, status: "running", startedAt: new Date() }
    });
}
async function closeRun(id, status) {
    await prisma.agentRun.update({ where: { id }, data: { status, finishedAt: new Date() } });
}
// ─── Schemas ──────────────────────────────────────────────────────────────────
const langPackSchema = z.object({
    language: z.string().trim().min(1),
    languageCode: z.string().trim().min(1),
    culturalAdaptations: z.array(z.string().trim().min(1)).default([]),
    seoKeywords: z.array(z.string().trim().min(1)).default([]),
    metaTitle: z.string().trim().min(1),
    metaDescription: z.string().trim().min(1),
    homeHeroHeadline: z.string().trim().min(1),
    homeHeroSubtitle: z.string().trim().min(1),
    ctaText: z.string().trim().min(1)
});
const multilingualSiteSchema = z.object({
    projectTitle: z.string().trim().min(1),
    baseStrategy: z.string().trim().min(1),
    languagePacks: z.array(langPackSchema).min(1),
    technicalRecommendations: z.array(z.string().trim().min(1)).default([]),
    hreflangTags: z.array(z.string().trim().min(1)).default([]),
    launchChecklist: z.array(z.string().trim().min(1)).default([])
});
function buildPrompt(brief) {
    const langs = brief.agentDetails.targetLanguages.join(", ") || "non précisées";
    const pages = brief.agentDetails.requiredPages.join(", ") || "Home, About, Contact";
    return [
        `Projet: ${brief.title}`,
        `Résumé: ${brief.summary}`,
        `Langues cibles: ${langs}`,
        `Langue source: ${brief.agentDetails.sourceLanguage ?? "fr"}`,
        `Type de site: ${brief.agentDetails.siteType ?? "vitrine"}`,
        `Pages requises: ${pages}`,
        `SEO localisation: ${brief.agentDetails.seoLocalization}`,
        `Adaptation culturelle: ${brief.agentDetails.culturalAdaptation}`,
        `Audience: ${brief.targetAudience.join(", ") || "non précisée"}`,
        `Contraintes techniques: ${brief.agentDetails.technicalConstraints.join(", ") || "aucune"}`,
        "",
        "Instructions:",
        "- Génère un package multilingue complet avec adaptation culturelle pour chaque langue.",
        "- Inclus les mots-clés SEO locaux, les meta tags optimisés et les contenus hero adaptés.",
        "- Génère les balises hreflang pour chaque langue.",
        "- Fournis une checklist de lancement multilingue actionnable.",
        "- Les CTAs doivent être adaptés culturellement, pas juste traduits."
    ].join("\n");
}
export async function executeWebsiteMultilangPipeline(context) {
    const brief = context.parsedBrief;
    const run = await trackRun(context.jobId);
    let result;
    try {
        result = await parseJSON(buildPrompt(brief), multilingualSiteSchema, {
            model: MODEL,
            temperature: 0.6,
            maxOutputTokens: 4000,
            systemPrompt: "Tu es un expert SEO multilingue et internationalisation web. Tu crées des packages de contenu culturellement adaptés et SEO-optimisés pour chaque marché."
        });
        await closeRun(run.id, "completed");
    }
    catch (err) {
        await closeRun(run.id, "failed");
        throw err;
    }
    const doc = { metadata: { title: brief.title, languages: brief.agentDetails.targetLanguages, generatedAt: new Date().toISOString() }, ...result };
    const buf = Buffer.from(JSON.stringify(doc, null, 2), "utf8");
    const path = ["website-multilang", context.projectId, context.jobId, "multilang-package.json"].join("/");
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
            metadataJson: toJson({ agentType: "website_multilang", languages: result.languagePacks.length, signedUrl })
        },
        select: { id: true }
    });
    return {
        summary: `Site multilingue généré: ${result.languagePacks.length} langues adaptées culturellement avec SEO local.`,
        outputs: { documentAssetId: asset.id, documentUrl: signedUrl, ...result },
        qaChecklist: [
            "Vérifier la qualité des adaptations culturelles pour chaque langue",
            "Valider les mots-clés SEO locaux avec des outils de recherche",
            "Vérifier la cohérence des balises hreflang générées",
            "Confirmer que les CTAs sont naturels dans chaque langue"
        ],
        executionMetadata: { modelProvider: "openai", modelName: MODEL },
        delivery: { type: "website_multilang_package", status: "delivered", summaryText: `Package multilingue livré: ${result.languagePacks.length} langues avec SEO et adaptation culturelle.` }
    };
}
export const websiteMultilangPipeline = {
    agentType: "website_multilang",
    steps: [
        { key: "brief_analysis", label: "Analyse du brief", description: "Identifie les langues cibles et les besoins d'adaptation culturelle." },
        { key: "content_generation", label: "Génération multilingue", description: "Produit les packs de contenu adaptés culturellement pour chaque langue." },
        { key: "delivery_packaging", label: "Livraison", description: "Compile et stocke le package multilingue complet." }
    ],
    async execute(context) { return executeWebsiteMultilangPipeline(context); }
};
