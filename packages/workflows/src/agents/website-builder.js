import { createClient } from "@supabase/supabase-js";
import { generateImage, generateTextResult, parseJSONResult } from "@agents-marketing/ai";
import { prisma } from "@agents-marketing/db";
import { z } from "zod";
const openAiModel = "gpt-5.4-mini";
const falModel = "fal-ai/flux/dev";
const previewBucket = "website-builder-sites";
const siteStructureSchema = z.object({
    siteName: z.string().trim().min(1),
    siteType: z.string().trim().min(1),
    valueProposition: z.string().trim().min(1),
    metaTitle: z.string().trim().min(1).max(70),
    metaDescription: z.string().trim().min(80).max(180),
    navigation: z.array(z.object({
        label: z.string().trim().min(1),
        pageSlug: z.string().trim().min(1),
        href: z.string().trim().min(1)
    })).min(1),
    pages: z.array(z.object({
        slug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        purpose: z.string().trim().min(1),
        sections: z.array(z.object({
            id: z.string().trim().min(1),
            title: z.string().trim().min(1),
            type: z.string().trim().min(1),
            goal: z.string().trim().min(1)
        })).min(3)
    })).min(1),
    designDirection: z.object({
        colorMood: z.string().trim().min(1),
        typography: z.string().trim().min(1),
        uiMood: z.string().trim().min(1),
        interactionStyle: z.string().trim().min(1)
    }),
    heroImagePrompt: z.string().trim().min(1).nullable(),
    seoKeywords: z.array(z.string().trim().min(1)).default([])
});
const siteContentSchema = z.object({
    metaTitle: z.string().trim().min(1).max(70),
    metaDescription: z.string().trim().min(80).max(180),
    heroImageAlt: z.string().trim().min(1).nullable(),
    footer: z.object({
        tagline: z.string().trim().min(1),
        contactPrompt: z.string().trim().min(1),
        legalBlurb: z.string().trim().min(1)
    }),
    pages: z.array(z.object({
        slug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        navigationLabel: z.string().trim().min(1),
        sections: z.array(z.object({
            id: z.string().trim().min(1),
            sectionType: z.string().trim().min(1),
            sectionLabel: z.string().trim().min(1),
            eyebrow: z.string().trim().min(1).nullable(),
            headline: z.string().trim().min(1),
            description: z.string().trim().min(1),
            body: z.array(z.string().trim().min(1)).default([]),
            bulletPoints: z.array(z.string().trim().min(1)).default([]),
            primaryCtaLabel: z.string().trim().min(1).nullable(),
            primaryCtaHref: z.string().trim().min(1).nullable(),
            secondaryCtaLabel: z.string().trim().min(1).nullable(),
            secondaryCtaHref: z.string().trim().min(1).nullable(),
            stats: z.array(z.object({
                value: z.string().trim().min(1),
                label: z.string().trim().min(1)
            })).default([]),
            testimonials: z.array(z.object({
                name: z.string().trim().min(1),
                role: z.string().trim().min(1),
                quote: z.string().trim().min(1)
            })).default([]),
            faqItems: z.array(z.object({
                question: z.string().trim().min(1),
                answer: z.string().trim().min(1)
            })).default([])
        })).min(3)
    })).min(1)
});
function slugify(value, fallback) {
    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || fallback;
}
function toJsonValue(value) {
    return value;
}
function getStorageClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour Website Builder.");
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
async function ensurePublicBucket(bucket) {
    const client = getStorageClient();
    const existing = await client.storage.getBucket(bucket);
    if (existing.data) {
        const updateResult = await client.storage.updateBucket(bucket, {
            public: true
        });
        if (updateResult.error) {
            throw new Error(`Impossible de mettre à jour le bucket ${bucket}: ${updateResult.error.message}`);
        }
        return;
    }
    const createResult = await client.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 52428800
    });
    if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
        throw new Error(`Impossible de créer le bucket ${bucket}: ${createResult.error.message}`);
    }
}
async function createTrackedRun(jobId, provider, modelName, handler) {
    const run = await prisma.agentRun.create({
        data: {
            jobId,
            agentType: "website_builder",
            modelProvider: provider,
            modelName,
            status: "running",
            startedAt: new Date()
        }
    });
    try {
        const result = await handler();
        await prisma.agentRun.update({
            where: { id: run.id },
            data: {
                status: "completed",
                finishedAt: new Date(),
                ...(result.usage?.inputTokens !== null && result.usage?.inputTokens !== undefined
                    ? { inputTokens: result.usage.inputTokens }
                    : {}),
                ...(result.usage?.outputTokens !== null && result.usage?.outputTokens !== undefined
                    ? { outputTokens: result.usage.outputTokens }
                    : {})
            }
        });
        return result.value;
    }
    catch (error) {
        await prisma.agentRun.update({
            where: { id: run.id },
            data: {
                status: "failed",
                finishedAt: new Date()
            }
        });
        throw error;
    }
}
async function uploadTextAsset(organizationId, projectId, jobId, filePath, content, contentType, assetType, metadata) {
    const client = getStorageClient();
    const body = Buffer.from(content, "utf8");
    const uploadResult = await client.storage.from(previewBucket).upload(filePath, body, {
        upsert: true,
        contentType
    });
    if (uploadResult.error) {
        throw new Error(`Upload Supabase impossible pour ${filePath}: ${uploadResult.error.message}`);
    }
    const publicUrl = client.storage.from(previewBucket).getPublicUrl(filePath).data.publicUrl;
    await prisma.asset.create({
        data: {
            organizationId,
            projectId,
            jobId,
            assetType,
            storageBucket: previewBucket,
            storagePath: filePath,
            mimeType: contentType,
            sizeBytes: BigInt(body.byteLength),
            ...(metadata ? { metadataJson: toJsonValue(metadata) } : {})
        }
    });
    return {
        publicUrl,
        storagePath: filePath
    };
}
async function uploadRemoteImageAsset(organizationId, projectId, jobId, filePath, imageUrl, contentType, metadata) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Téléchargement de l'image hero impossible: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const client = getStorageClient();
    const uploadResult = await client.storage.from(previewBucket).upload(filePath, body, {
        upsert: true,
        contentType
    });
    if (uploadResult.error) {
        throw new Error(`Upload de l'image hero impossible: ${uploadResult.error.message}`);
    }
    const publicUrl = client.storage.from(previewBucket).getPublicUrl(filePath).data.publicUrl;
    await prisma.asset.create({
        data: {
            organizationId,
            projectId,
            jobId,
            assetType: "image",
            storageBucket: previewBucket,
            storagePath: filePath,
            mimeType: contentType,
            sizeBytes: BigInt(body.byteLength),
            ...(metadata ? { metadataJson: toJsonValue(metadata) } : {})
        }
    });
    return {
        publicUrl,
        storagePath: filePath
    };
}
function buildWebsiteBrief(context) {
    const details = context.parsedBrief.agentDetails;
    return {
        title: context.parsedBrief.title,
        summary: context.parsedBrief.summary,
        objectives: context.parsedBrief.objectives,
        siteType: details.siteType ?? "site vitrine",
        businessSector: details.businessSector ?? context.parsedBrief.memoryContext.brand.industry ?? "activité généraliste",
        targetAudience: details.targetAudienceDescription ??
            context.parsedBrief.targetAudience.join(", ") ??
            context.parsedBrief.memoryContext.brand.targetAudience ??
            "audience B2B et B2C qualifiée",
        primaryCta: details.primaryCta ?? context.parsedBrief.callToAction ?? "Prendre contact",
        requiredPages: details.requiredPages,
        siteMapSections: details.siteMapSections,
        existingContent: details.existingContent,
        tone: details.styleTone ?? context.parsedBrief.tone ?? context.parsedBrief.memoryContext.brand.toneOfVoice ?? "premium, clair et rassurant",
        constraints: [...context.parsedBrief.constraints, ...details.technicalConstraints],
        references: context.parsedBrief.references,
        locale: context.parsedBrief.locale ?? "fr-FR",
        brandName: context.parsedBrief.memoryContext.brand.brandName ?? context.parsedBrief.title
    };
}
async function generateSiteStructure(jobId, brief) {
    return createTrackedRun(jobId, "openai", openAiModel, async () => {
        const result = await parseJSONResult([
            "Tu es un directeur créatif web senior.",
            "Construis l'architecture d'un site marketing complet et réaliste.",
            "Le résultat doit être cohérent avec un site autonome statique à déployer sur Supabase Storage.",
            "Les href doivent utiliser index.html pour la page d'accueil et <slug>.html pour les pages secondaires.",
            "Prévois au moins une page d'accueil et ajoute des pages secondaires seulement si elles apportent une vraie valeur business.",
            "Le heroImagePrompt doit être null si une illustration n'est pas nécessaire.",
            "",
            "Brief structuré :",
            JSON.stringify(brief, null, 2)
        ].join("\n"), siteStructureSchema, {
            model: openAiModel,
            temperature: 0.4,
            maxOutputTokens: 2600,
            systemPrompt: "Tu conçois des structures de sites web modernes, SEO-friendly, responsives et orientées conversion."
        });
        return {
            value: result.data,
            usage: result.usage
        };
    });
}
async function generateSiteContent(jobId, brief, structure) {
    return createTrackedRun(jobId, "openai", openAiModel, async () => {
        const result = await parseJSONResult([
            "Tu es un copywriter web senior spécialisé conversion et brand voice.",
            "Rédige les contenus de toutes les sections du site.",
            "Le ton doit être naturel, premium, crédible et prêt à publier.",
            "Ajoute des FAQ et témoignages plausibles lorsqu'ils sont pertinents.",
            "Chaque section doit avoir un headline fort, une description claire et des CTA actionnables quand utile.",
            "",
            "Brief structuré :",
            JSON.stringify(brief, null, 2),
            "",
            "Architecture du site :",
            JSON.stringify(structure, null, 2)
        ].join("\n"), siteContentSchema, {
            model: openAiModel,
            temperature: 0.6,
            maxOutputTokens: 4200,
            systemPrompt: "Tu produis du contenu web complet, cohérent entre les pages et optimisé pour la conversion."
        });
        return {
            value: result.data,
            usage: result.usage
        };
    });
}
async function maybeGenerateHeroImage(jobId, structure) {
    const heroImagePrompt = structure.heroImagePrompt;
    if (!process.env.FAL_KEY || !heroImagePrompt) {
        return null;
    }
    return createTrackedRun(jobId, "fal", falModel, async () => {
        const result = await generateImage(heroImagePrompt, {
            model: falModel,
            imageSize: "landscape_16_9",
            outputFormat: "png",
            numImages: 1
        });
        return {
            value: {
                url: result.images[0].url,
                contentType: result.images[0].contentType,
                prompt: result.prompt
            },
            usage: null
        };
    });
}
function buildPageFilename(slug) {
    return slug === "index" ? "index.html" : `${slug}.html`;
}
function normalizeStructure(structure) {
    const pages = structure.pages.map((page, index) => {
        const normalizedSlug = index === 0 ? "index" : slugify(page.slug, `page-${index + 1}`);
        return {
            ...page,
            slug: normalizedSlug,
            sections: page.sections.map((section, sectionIndex) => ({
                ...section,
                id: slugify(section.id || section.title, `section-${sectionIndex + 1}`)
            }))
        };
    });
    const navigation = pages.map((page, index) => ({
        label: structure.navigation[index]?.label ?? page.title,
        pageSlug: page.slug,
        href: buildPageFilename(page.slug)
    }));
    return {
        ...structure,
        pages,
        navigation
    };
}
function normalizeContent(content, structure) {
    const pages = structure.pages.map((page) => {
        const matchingPage = content.pages.find((item) => slugify(item.slug, page.slug) === page.slug) ??
            content.pages.find((item) => item.title === page.title);
        return {
            slug: page.slug,
            title: matchingPage?.title ?? page.title,
            navigationLabel: matchingPage?.navigationLabel ??
                structure.navigation.find((item) => item.pageSlug === page.slug)?.label ??
                page.title,
            sections: page.sections.map((section) => {
                const matchingSection = matchingPage?.sections.find((item) => slugify(item.id, section.id) === section.id) ??
                    matchingPage?.sections.find((item) => item.sectionLabel === section.title);
                return {
                    id: section.id,
                    sectionType: matchingSection?.sectionType ?? section.type,
                    sectionLabel: matchingSection?.sectionLabel ?? section.title,
                    eyebrow: matchingSection?.eyebrow ?? null,
                    headline: matchingSection?.headline ?? section.title,
                    description: matchingSection?.description ?? section.goal,
                    body: matchingSection?.body ?? [],
                    bulletPoints: matchingSection?.bulletPoints ?? [],
                    primaryCtaLabel: matchingSection?.primaryCtaLabel ?? null,
                    primaryCtaHref: matchingSection?.primaryCtaHref ?? null,
                    secondaryCtaLabel: matchingSection?.secondaryCtaLabel ?? null,
                    secondaryCtaHref: matchingSection?.secondaryCtaHref ?? null,
                    stats: matchingSection?.stats ?? [],
                    testimonials: matchingSection?.testimonials ?? [],
                    faqItems: matchingSection?.faqItems ?? []
                };
            })
        };
    });
    return {
        ...content,
        pages
    };
}
async function generateHtmlPage(jobId, structure, content, page, heroImageUrl) {
    const result = await createTrackedRun(jobId, "openai", openAiModel, async () => {
        const html = await generateTextResult([
            "Génère un document HTML complet et autonome.",
            "Contraintes obligatoires :",
            "- Retourne uniquement le HTML brut, sans markdown.",
            "- Utilise Tailwind via https://cdn.tailwindcss.com avec une config inline.",
            "- Design premium, moderne, responsive, dark/light mode avec toggle fonctionnel.",
            "- SEO de base complet: title, meta description, Open Graph minimal, headings propres, alt text sur les images.",
            "- Accessibilité correcte: contrastes, labels, aria si nécessaire.",
            "- Navigation desktop + mobile.",
            "- Le site doit fonctionner sans build step.",
            "- Utilise les liens de navigation fournis tels quels.",
            heroImageUrl ? `- Utilise l'image hero suivante quand c'est pertinent: ${heroImageUrl}` : "- N'invente pas d'image distante autre que les assets fournis.",
            "",
            "Architecture globale :",
            JSON.stringify(structure, null, 2),
            "",
            "Contenu global :",
            JSON.stringify({
                metaTitle: content.metaTitle,
                metaDescription: content.metaDescription,
                heroImageAlt: content.heroImageAlt,
                footer: content.footer
            }, null, 2),
            "",
            "Page à générer :",
            JSON.stringify(page, null, 2)
        ].join("\n"), {
            model: openAiModel,
            temperature: 0.45,
            maxOutputTokens: 5200,
            systemPrompt: "Tu es un développeur frontend expert en landing pages et sites marketing haut de gamme."
        });
        return {
            value: html.text,
            usage: html.usage
        };
    });
    const trimmed = result.trim();
    return /^<!doctype html>/i.test(trimmed) ? trimmed : `<!DOCTYPE html>\n${trimmed}`;
}
export const websiteBuilderPipeline = {
    agentType: "website_builder",
    steps: [
        {
            key: "goal_extraction",
            label: "Extraction des objectifs",
            description: "Isole l’offre, le type de site, l’audience et les CTA prioritaires."
        },
        {
            key: "site_map_generation",
            label: "Génération du sitemap",
            description: "Construit les pages, sections et la navigation via GPT."
        },
        {
            key: "delivery_preparation",
            label: "Préparation de livraison",
            description: "Produit le bundle HTML, le preview et les assets stockés dans Supabase."
        }
    ],
    async execute(context) {
        await ensurePublicBucket(previewBucket);
        const project = await prisma.project.findUnique({
            where: {
                id: context.projectId
            },
            select: {
                organizationId: true,
                title: true,
                brand: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!project) {
            throw new Error(`Projet introuvable pour Website Builder: ${context.projectId}`);
        }
        const brief = buildWebsiteBrief(context);
        const rawStructure = await generateSiteStructure(context.jobId, brief);
        const structure = normalizeStructure(rawStructure);
        const rawContent = await generateSiteContent(context.jobId, brief, structure);
        const content = normalizeContent(rawContent, structure);
        const generatedHeroImage = await maybeGenerateHeroImage(context.jobId, structure);
        const siteFolder = `projects/${project.organizationId}/${context.projectId}/${context.jobId}`;
        const uploadedAssets = [];
        let heroImagePublicUrl = null;
        if (generatedHeroImage) {
            const extension = generatedHeroImage.contentType?.includes("jpeg") ? "jpg" : "png";
            const heroAsset = await uploadRemoteImageAsset(project.organizationId, context.projectId, context.jobId, `${siteFolder}/hero.${extension}`, generatedHeroImage.url, generatedHeroImage.contentType ?? "image/png", {
                source: "fal.ai",
                prompt: generatedHeroImage.prompt
            });
            heroImagePublicUrl = heroAsset.publicUrl;
            uploadedAssets.push({
                assetType: "image",
                storagePath: heroAsset.storagePath,
                url: heroAsset.publicUrl
            });
        }
        const generatedPages = await Promise.all(content.pages.map(async (page) => {
            const html = await generateHtmlPage(context.jobId, structure, content, page, heroImagePublicUrl);
            const fileName = buildPageFilename(page.slug);
            const uploadedPage = await uploadTextAsset(project.organizationId, context.projectId, context.jobId, `${siteFolder}/${fileName}`, html, "text/html; charset=utf-8", "preview", {
                slug: page.slug,
                title: page.title
            });
            uploadedAssets.push({
                assetType: "preview",
                storagePath: uploadedPage.storagePath,
                url: uploadedPage.publicUrl
            });
            return {
                slug: page.slug,
                title: page.title,
                fileName,
                html,
                publicUrl: uploadedPage.publicUrl
            };
        }));
        const previewPage = generatedPages.find((page) => page.slug === "index") ?? generatedPages[0];
        if (!previewPage) {
            throw new Error("Aucune page générée : impossible de construire le bundle.");
        }
        const bundleManifest = {
            generatedAt: new Date().toISOString(),
            brief,
            structure,
            content,
            previewUrl: previewPage.publicUrl,
            heroImageUrl: heroImagePublicUrl,
            files: generatedPages.map((page) => ({
                path: `${siteFolder}/${page.fileName}`,
                publicUrl: page.publicUrl
            }))
        };
        const bundleAsset = await uploadTextAsset(project.organizationId, context.projectId, context.jobId, `${siteFolder}/bundle.json`, JSON.stringify(bundleManifest, null, 2), "application/json; charset=utf-8", "code_bundle", {
            pageCount: generatedPages.length,
            siteType: structure.siteType
        });
        uploadedAssets.push({
            assetType: "code_bundle",
            storagePath: bundleAsset.storagePath,
            url: bundleAsset.publicUrl
        });
        return {
            summary: `Website Builder a généré ${generatedPages.length} page(s) pour ${context.parsedBrief.title} avec un preview déployable.`,
            outputs: {
                primaryCta: brief.primaryCta,
                siteType: structure.siteType,
                requiredPages: structure.pages.map((page) => page.title),
                siteMapSections: structure.pages.flatMap((page) => page.sections.map((section) => `${page.title}: ${section.title}`)),
                previewUrl: previewPage.publicUrl,
                bundleUrl: bundleAsset.publicUrl,
                heroImageUrl: heroImagePublicUrl,
                assets: uploadedAssets
            },
            qaChecklist: [
                "Vérifier le rendu responsive sur mobile et desktop",
                "Valider les CTA principaux et secondaires sur chaque page",
                "Contrôler les meta tags SEO et la hiérarchie des headings",
                "Relire les FAQ, témoignages et promesses de marque avant publication"
            ],
            delivery: {
                type: "website_bundle",
                status: "ready_for_review",
                summaryText: `Bundle HTML autonome prêt dans Supabase Storage. Preview: ${previewPage.publicUrl}`
            }
        };
    }
};
