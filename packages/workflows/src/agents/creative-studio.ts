import { createFalClient, parseJSON, type FalAspectRatio, type FalImageResult, type SeedreamImageSize } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

type CreativeStudioContext = AgentPipelineContext<"creative_studio">;
type CreativeStudioParsedBrief = ParsedBriefByAgentType<"creative_studio">;
type CreativeModelKind = "seedream_text" | "seedream_edit" | "flux_kontext";

interface CreativeFormatSpec {
  id: string;
  label: string;
  width: number;
  height: number;
  seedreamSize: SeedreamImageSize;
  fluxAspectRatio: FalAspectRatio;
  logoMode: boolean;
}

interface CreativeVariantDraft {
  formatId?: string;
  title: string;
  prompt: string;
  rationale: string;
  providerHint: "seedream" | "flux_kontext";
  textOverlay: string[];
  logoFocus: boolean;
}

interface CreativePromptPlan {
  creativeStrategy: string;
  formatPlans: Array<{
    formatId: string;
    variants: CreativeVariantDraft[];
  }>;
}

interface CreativeGenerationRequest {
  format: CreativeFormatSpec;
  variantIndex: number;
  draft: CreativeVariantDraft;
  referenceImageUrl: string | null;
  modelKind: CreativeModelKind;
  prompt: string;
}

interface StoredCreativeAsset {
  bucket: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
  sourceUrl: string;
  width: number;
  height: number;
}

interface CreatedAssetRecord {
  assetId: string;
}

interface CreativeExecutionAsset {
  assetId: string;
  formatId: string;
  formatLabel: string;
  variantIndex: number;
  title: string;
  prompt: string;
  rationale: string;
  provider: CreativeModelKind;
  width: number;
  height: number;
  storageBucket: string;
  storagePath: string;
  deliveryUrl: string | null;
  sourceUrl: string;
  mimeType: string;
  referenceImageUrl: string | null;
}

interface CreativePipelineProgress {
  stage: string;
  message: string;
  completedAssets?: number;
  totalAssets?: number;
  requestedFormats?: string[];
}

interface CreativeTrackedStep {
  jobId: string;
  agentType: "creative_studio";
  modelProvider: string;
  modelName: string;
}

export interface CreativeStudioDependencies {
  log: Pick<Console, "info" | "warn" | "error">;
  runTrackedStep<T>(step: CreativeTrackedStep, handler: () => Promise<T>): Promise<T>;
  updateProgress(progress: CreativePipelineProgress): Promise<void>;
  generatePromptPlan(input: {
    parsedBrief: CreativeStudioParsedBrief;
    formats: CreativeFormatSpec[];
    variantsPerFormat: number;
  }): Promise<CreativePromptPlan>;
  generateImage(request: CreativeGenerationRequest): Promise<FalImageResult>;
  storeImage(input: {
    context: CreativeStudioContext;
    request: CreativeGenerationRequest;
    image: FalImageResult["images"][number];
  }): Promise<StoredCreativeAsset>;
  createAssetRecord(input: {
    context: CreativeStudioContext;
    request: CreativeGenerationRequest;
    storedAsset: StoredCreativeAsset;
  }): Promise<CreatedAssetRecord>;
}

const creativePromptPlanSchema = z.object({
  creativeStrategy: z.string().trim().min(1),
  formatPlans: z
    .array(
      z.object({
        formatId: z.string().trim().min(1),
        variants: z
          .array(
            z.object({
              title: z.string().trim().min(1),
              prompt: z.string().trim().min(1),
              rationale: z.string().trim().min(1),
              providerHint: z.enum(["seedream", "flux_kontext"]).default("seedream"),
              textOverlay: z.array(z.string().trim().min(1)).default([]),
              logoFocus: z.boolean().default(false)
            })
          )
          .min(1)
      })
    )
    .min(1)
});

const creativeFormatCatalog: Record<string, CreativeFormatSpec> = {
  instagram_post: {
    id: "instagram_post",
    label: "Post Instagram",
    width: 1080,
    height: 1080,
    seedreamSize: "square_hd",
    fluxAspectRatio: "1:1",
    logoMode: false
  },
  instagram_story: {
    id: "instagram_story",
    label: "Story Instagram",
    width: 1080,
    height: 1920,
    seedreamSize: "portrait_16_9",
    fluxAspectRatio: "9:16",
    logoMode: false
  },
  youtube_thumbnail: {
    id: "youtube_thumbnail",
    label: "Thumbnail YouTube",
    width: 1280,
    height: 720,
    seedreamSize: "landscape_16_9",
    fluxAspectRatio: "16:9",
    logoMode: false
  },
  facebook_banner: {
    id: "facebook_banner",
    label: "Bannière Facebook",
    width: 1200,
    height: 628,
    seedreamSize: "landscape_16_9",
    fluxAspectRatio: "16:9",
    logoMode: false
  },
  google_ads: {
    id: "google_ads",
    label: "Google Ads",
    width: 1200,
    height: 628,
    seedreamSize: "landscape_16_9",
    fluxAspectRatio: "16:9",
    logoMode: false
  },
  logo: {
    id: "logo",
    label: "Logo",
    width: 1024,
    height: 1024,
    seedreamSize: "square_hd",
    fluxAspectRatio: "1:1",
    logoMode: true
  }
};

const creativeFormatAliases: Record<string, string> = {
  "instagram": "instagram_post",
  "post instagram": "instagram_post",
  "instagram post": "instagram_post",
  "insta post": "instagram_post",
  "story instagram": "instagram_story",
  "instagram story": "instagram_story",
  "thumbnail youtube": "youtube_thumbnail",
  "youtube thumbnail": "youtube_thumbnail",
  "thumb youtube": "youtube_thumbnail",
  "banniere facebook": "facebook_banner",
  "bannière facebook": "facebook_banner",
  "facebook banner": "facebook_banner",
  "facebook cover": "facebook_banner",
  "google ad": "google_ads",
  "google ads": "google_ads",
  "display ad": "google_ads",
  "logo marque": "logo",
  "brand logo": "logo"
};

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clampVariantCount(deliverableCount: number | null | undefined, formatCount: number): number {
  const fallback = formatCount > 1 ? 3 : 4;
  const desired = deliverableCount ?? fallback;
  return Math.min(4, Math.max(3, desired));
}

function pickFormatSpec(rawValue: string): CreativeFormatSpec | null {
  const normalized = normalizeLabel(rawValue);
  const directKey = normalized.replace(/ /g, "_");
  const canonicalKey = creativeFormatCatalog[directKey]
    ? directKey
    : creativeFormatAliases[normalized] ?? creativeFormatAliases[directKey];

  return canonicalKey ? creativeFormatCatalog[canonicalKey] ?? null : null;
}

function extractRequestedFormats(parsedBrief: CreativeStudioParsedBrief): CreativeFormatSpec[] {
  const rawFormats = [
    ...parsedBrief.agentDetails.requestedFormats,
    ...parsedBrief.agentDetails.assetFormats,
    ...parsedBrief.deliverables
  ];
  const resolvedFormats = rawFormats
    .map((rawFormat) => pickFormatSpec(rawFormat))
    .filter((format): format is CreativeFormatSpec => format !== null);

  if (parsedBrief.agentDetails.logoRequested || rawFormats.some((format) => normalizeLabel(format).includes("logo"))) {
    const logoSpec = creativeFormatCatalog["logo"];

    if (logoSpec) {
      resolvedFormats.push(logoSpec);
    }
  }

  const uniqueFormats = new Map<string, CreativeFormatSpec>();

  for (const format of resolvedFormats) {
    uniqueFormats.set(format.id, format);
  }

  if (uniqueFormats.size === 0) {
    const defaultSpec = creativeFormatCatalog["instagram_post"];

    if (defaultSpec) {
      uniqueFormats.set(defaultSpec.id, defaultSpec);
    }
  }

  return [...uniqueFormats.values()];
}

function extractReferenceImageUrls(parsedBrief: CreativeStudioParsedBrief): string[] {
  const referencePattern = /https?:\/\/[^\s)]+/gi;
  const candidates = [...parsedBrief.references, ...parsedBrief.agentDetails.visualReferences];
  const urls = candidates.flatMap((entry) => entry.match(referencePattern) ?? []);

  return [...new Set(urls)];
}

function buildCopyToInclude(parsedBrief: CreativeStudioParsedBrief): string[] {
  const copy = [
    ...parsedBrief.agentDetails.copyToInclude,
    ...parsedBrief.keyMessages,
    ...(parsedBrief.callToAction ? [parsedBrief.callToAction] : [])
  ];

  return [...new Set(copy.filter((item) => item.trim().length > 0))];
}

function buildBrandingNotes(parsedBrief: CreativeStudioParsedBrief): string[] {
  const memoryBrand = parsedBrief.memoryContext.brand;
  const notes = [
    ...parsedBrief.agentDetails.brandingColors,
    ...parsedBrief.agentDetails.brandingNotes,
    ...(memoryBrand.brandName ? [`Marque: ${memoryBrand.brandName}`] : []),
    ...(memoryBrand.toneOfVoice ? [`Ton: ${memoryBrand.toneOfVoice}`] : []),
    ...parsedBrief.constraints
  ];

  return [...new Set(notes.filter((note) => note.trim().length > 0))];
}

function buildPromptGeneratorPrompt(input: {
  parsedBrief: CreativeStudioParsedBrief;
  formats: CreativeFormatSpec[];
  variantsPerFormat: number;
}): string {
  const copyToInclude = buildCopyToInclude(input.parsedBrief);
  const brandingNotes = buildBrandingNotes(input.parsedBrief);

  return [
    `Sujet: ${input.parsedBrief.agentDetails.subject ?? input.parsedBrief.title}`,
    `Résumé: ${input.parsedBrief.summary}`,
    `Style voulu: ${input.parsedBrief.agentDetails.desiredStyle ?? input.parsedBrief.tone ?? "à déduire"}`,
    `Audience: ${input.parsedBrief.targetAudience.join(", ") || "non précisée"}`,
    `Directions visuelles: ${input.parsedBrief.agentDetails.visualDirections.join(" | ") || "aucune"}`,
    `Références visuelles: ${input.parsedBrief.agentDetails.visualReferences.join(" | ") || "aucune"}`,
    `Texte à inclure: ${copyToInclude.join(" | ") || "aucun texte obligatoire"}`,
    `Branding/couleurs: ${brandingNotes.join(" | ") || "non précisé"}`,
    `Formats: ${input.formats.map((format) => `${format.id} (${format.width}x${format.height})`).join(", ")}`,
    `Variantes par format: ${input.variantsPerFormat}`,
    "",
    "Instructions:",
    "- Génère des prompts premium, précis, visuels, pensés pour des visuels marketing professionnels.",
    "- Chaque variante doit être suffisamment différente pour couvrir plusieurs angles créatifs tout en restant cohérente avec la marque.",
    "- Si le format est un logo, privilégie la simplicité, la lisibilité et l'adaptabilité multi-supports.",
    "- Mentionne clairement le style, la composition, l'éclairage, la hiérarchie visuelle, la présence du texte, les couleurs et le rendu final.",
    "- providerHint=flux_kontext seulement si une logique de transformation d'un visuel de référence serait pertinente; sinon seedream.",
    "- Retourne une stratégie créative globale et des variantes par format."
  ].join("\n");
}

function buildFallbackPromptPlan(
  parsedBrief: CreativeStudioParsedBrief,
  formats: CreativeFormatSpec[],
  variantsPerFormat: number
): CreativePromptPlan {
  const subject = parsedBrief.agentDetails.subject ?? parsedBrief.title;
  const style = parsedBrief.agentDetails.desiredStyle ?? parsedBrief.tone ?? "premium marketing";
  const copy = buildCopyToInclude(parsedBrief);
  const branding = buildBrandingNotes(parsedBrief).join(", ");
  const directions = parsedBrief.agentDetails.visualDirections;
  const variantAngles = [
    "hero impact premium",
    "lifestyle authentique conversion",
    "minimal branding fort",
    "offre performante orientée clic"
  ];

  return {
    creativeStrategy: `Déployer une direction ${style} autour de ${subject} en gardant une forte cohérence de marque.`,
    formatPlans: formats.map((format) => ({
      formatId: format.id,
      variants: Array.from({ length: variantsPerFormat }, (_, index) => {
        const angle = variantAngles[index] ?? variantAngles[variantAngles.length - 1];
        const direction = directions[index % Math.max(1, directions.length)] ?? style;
        const prompt = [
          `${format.logoMode ? "Create a professional vector-style brand logo" : "Create a professional marketing visual"} for ${subject}.`,
          `Format ${format.width}x${format.height}.`,
          `Creative angle: ${angle}.`,
          `Visual style: ${direction}.`,
          copy.length > 0 ? `Integrate this text naturally and legibly: ${copy.join(" | ")}.` : null,
          branding.length > 0 ? `Respect brand constraints and colors: ${branding}.` : null,
          format.logoMode
            ? "Keep the mark clean, timeless, scalable, high contrast, simple geometry, transparent background feel."
            : "Use premium lighting, strong composition, polished typography hierarchy, conversion-focused framing, crisp details."
        ]
          .filter(Boolean)
          .join(" ");

        return {
          formatId: format.id,
          title: `${format.label} - Variante ${index + 1}`,
          prompt,
          rationale: `Variante ${index + 1} orientée ${angle}.`,
          providerHint: format.logoMode ? "seedream" : "seedream",
          textOverlay: copy,
          logoFocus: format.logoMode
        };
      })
    }))
  };
}

function normalizePromptPlan(
  parsedBrief: CreativeStudioParsedBrief,
  formats: CreativeFormatSpec[],
  variantsPerFormat: number,
  promptPlan: CreativePromptPlan
): CreativePromptPlan {
  const fallbackPlan = buildFallbackPromptPlan(parsedBrief, formats, variantsPerFormat);
  const plansByFormat = new Map(promptPlan.formatPlans.map((formatPlan) => [formatPlan.formatId, formatPlan]));

  return {
    creativeStrategy: promptPlan.creativeStrategy,
    formatPlans: formats.map((format) => {
      const existing = plansByFormat.get(format.id);
      const fallback = fallbackPlan.formatPlans.find((formatPlan) => formatPlan.formatId === format.id);
      const baseVariants = existing?.variants ?? fallback?.variants ?? [];
      const firstFallbackFormatPlan = fallbackPlan.formatPlans[0];
      const normalizedVariants = Array.from({ length: variantsPerFormat }, (_, index): CreativeVariantDraft => {
        const fromFallbackPlan =
          firstFallbackFormatPlan?.variants[index] ?? firstFallbackFormatPlan?.variants[0];
        const ultimate: CreativeVariantDraft = fromFallbackPlan ?? {
          title: `${format.label} - Variante ${index + 1}`,
          prompt: `Create a professional marketing visual for ${format.label}.`,
          rationale: `Variante par défaut ${index + 1}.`,
          providerHint: "seedream",
          textOverlay: [],
          logoFocus: format.logoMode
        };

        return baseVariants[index] ?? fallback?.variants[index] ?? ultimate;
      });

      return {
        formatId: format.id,
        variants: normalizedVariants.map((variant, index) => ({
          ...variant,
          title: variant.title || `${format.label} - Variante ${index + 1}`,
          providerHint: format.logoMode ? "seedream" : variant.providerHint,
          logoFocus: format.logoMode || variant.logoFocus
        }))
      };
    })
  };
}

function selectModelKind(format: CreativeFormatSpec, providerHint: CreativeVariantDraft["providerHint"], referenceImageUrl: string | null): CreativeModelKind {
  if (format.logoMode) {
    return "seedream_text";
  }

  if (referenceImageUrl && providerHint === "flux_kontext") {
    return "flux_kontext";
  }

  if (referenceImageUrl) {
    return "seedream_edit";
  }

  return "seedream_text";
}

function composeGenerationPrompt(
  parsedBrief: CreativeStudioParsedBrief,
  request: {
    format: CreativeFormatSpec;
    draft: CreativeVariantDraft;
  }
): string {
  const subject = parsedBrief.agentDetails.subject ?? parsedBrief.title;
  const style = parsedBrief.agentDetails.desiredStyle ?? parsedBrief.tone ?? "premium marketing";
  const copy = buildCopyToInclude(parsedBrief);
  const branding = buildBrandingNotes(parsedBrief);
  const promptSections = [
    request.draft.prompt,
    `Target format: ${request.format.label}, ${request.format.width}x${request.format.height}.`,
    `Subject: ${subject}.`,
    `Desired style: ${style}.`,
    request.draft.textOverlay.length > 0 ? `Mandatory text overlay guidance: ${request.draft.textOverlay.join(" | ")}.` : null,
    copy.length > 0 && request.draft.textOverlay.length === 0 ? `Essential copy to preserve: ${copy.join(" | ")}.` : null,
    branding.length > 0 ? `Branding constraints: ${branding.join(" | ")}.` : null,
    request.format.logoMode
      ? "Deliver a clean logo concept with balanced geometry, memorable silhouette, strong contrast, and adaptable brand identity."
      : "Deliver a campaign-ready visual with clear focal point, polished details, premium lighting, and professional ad quality."
  ];

  return promptSections.filter(Boolean).join(" ");
}

function buildGenerationRequests(
  parsedBrief: CreativeStudioParsedBrief,
  formats: CreativeFormatSpec[],
  promptPlan: CreativePromptPlan,
  referenceImageUrls: string[]
): CreativeGenerationRequest[] {
  const formatMap = new Map(formats.map((format) => [format.id, format]));

  return promptPlan.formatPlans.flatMap((formatPlan) => {
    const format = formatMap.get(formatPlan.formatId);

    if (!format) {
      return [];
    }

    return formatPlan.variants.map((draft, index) => {
      const referenceImageUrl = format.logoMode ? null : referenceImageUrls[index % Math.max(1, referenceImageUrls.length)] ?? null;
      const modelKind = selectModelKind(format, draft.providerHint, referenceImageUrl);

      return {
        format,
        variantIndex: index + 1,
        draft,
        referenceImageUrl,
        modelKind,
        prompt: composeGenerationPrompt(parsedBrief, {
          format,
          draft
        })
      };
    });
  });
}

function sanitizeFileName(value: string): string {
  return normalizeLabel(value).replace(/ /g, "-") || "asset";
}

function inferMimeType(imageUrl: string, providedMimeType?: string): string {
  if (providedMimeType) {
    return providedMimeType;
  }

  const lowerValue = imageUrl.toLowerCase();

  if (lowerValue.endsWith(".png")) {
    return "image/png";
  }

  if (lowerValue.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour stocker les assets créatifs.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getCreativeAssetsBucket(): string {
  return process.env.SUPABASE_ASSETS_BUCKET?.trim() || "generated-assets";
}

function createDefaultDependencies(context: CreativeStudioContext): CreativeStudioDependencies {
  const falClient = createFalClient({
    logger: {
      info(message, details) {
        console.info(message, details);
      },
      warn(message, details) {
        console.warn(message, details);
      },
      error(message, details) {
        console.error(message, details);
      }
    }
  });

  return {
    log: console,
    async runTrackedStep<T>(step: CreativeTrackedStep, handler: () => Promise<T>) {
      const agentRun = await prisma.agentRun.create({
        data: {
          jobId: step.jobId,
          agentType: step.agentType,
          modelProvider: step.modelProvider,
          modelName: step.modelName,
          status: "running",
          startedAt: new Date()
        }
      });

      try {
        const result = await handler();
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: "completed",
            finishedAt: new Date()
          }
        });

        return result;
      } catch (error) {
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: "failed",
            finishedAt: new Date()
          }
        });
        throw error;
      }
    },
    async updateProgress(progress) {
      await prisma.jobStep.update({
        where: {
          jobId_stepOrder: {
            jobId: context.jobId,
            stepOrder: 2
          }
        },
        data: {
          outputJson: toJsonValue(progress)
        }
      });
    },
    async generatePromptPlan(input) {
      return parseJSON(buildPromptGeneratorPrompt(input), creativePromptPlanSchema, {
        model: "gpt-5.4-mini",
        temperature: 0.7,
        maxOutputTokens: 2_200,
        systemPrompt:
          "Tu es un directeur créatif senior spécialisé en prompts visuels marketing premium pour génération d'images."
      });
    },
    async generateImage(request) {
      if (request.modelKind === "flux_kontext") {
        if (!request.referenceImageUrl) {
          throw new Error("Flux Kontext nécessite une image de référence.");
        }

        return falClient.generateFluxKontext({
          prompt: request.prompt,
          imageUrl: request.referenceImageUrl,
          aspectRatio: request.format.fluxAspectRatio,
          numImages: 1,
          outputFormat: request.format.logoMode ? "png" : "png",
          enhancePrompt: true
        });
      }

      if (request.modelKind === "seedream_edit") {
        if (!request.referenceImageUrl) {
          throw new Error("Seedream edit nécessite une image de référence.");
        }

        return falClient.generateSeedreamEdit({
          prompt: request.prompt,
          imageUrls: [request.referenceImageUrl],
          imageSize: request.format.seedreamSize,
          numImages: 1
        });
      }

      return falClient.generateSeedreamTextToImage({
        prompt: request.prompt,
        imageSize: request.format.seedreamSize,
        numImages: 1
      });
    },
    async storeImage(input) {
      const supabase = getSupabaseAdminClient();
      const bucket = getCreativeAssetsBucket();
      const response = await fetch(input.image.url);

      if (!response.ok) {
        throw new Error(`Impossible de télécharger l'image générée ${input.image.url}.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const mimeType = inferMimeType(input.image.url, input.image.contentType ?? response.headers.get("content-type") ?? undefined);
      const extension = extensionFromMimeType(mimeType);
      const filePath = [
        "creative-studio",
        input.context.projectId,
        input.context.jobId,
        input.request.format.id,
        `${sanitizeFileName(input.request.draft.title)}-v${input.request.variantIndex}.${extension}`
      ].join("/");

      const uploadResult = await supabase.storage.from(bucket).upload(filePath, Buffer.from(arrayBuffer), {
        contentType: mimeType,
        upsert: true
      });

      if (uploadResult.error) {
        throw new Error(`Échec upload Supabase Storage: ${uploadResult.error.message}`);
      }

      const signedUrlResult = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24 * 7);

      return {
        bucket,
        path: filePath,
        mimeType,
        sizeBytes: arrayBuffer.byteLength,
        signedUrl: signedUrlResult.data?.signedUrl ?? null,
        sourceUrl: input.image.url,
        width: input.image.width,
        height: input.image.height
      };
    },
    async createAssetRecord(input) {
      const asset = await prisma.asset.create({
        data: {
          organizationId: input.context.parsedBrief.memoryContext.brand.brandId
            ? (
                await prisma.project.findUniqueOrThrow({
                  where: { id: input.context.projectId },
                  select: { organizationId: true }
                })
              ).organizationId
            : (
                await prisma.project.findUniqueOrThrow({
                  where: { id: input.context.projectId },
                  select: { organizationId: true }
                })
              ).organizationId,
          projectId: input.context.projectId,
          jobId: input.context.jobId,
          assetType: "image",
          storageBucket: input.storedAsset.bucket,
          storagePath: input.storedAsset.path,
          mimeType: input.storedAsset.mimeType,
          sizeBytes: BigInt(input.storedAsset.sizeBytes),
          metadataJson: toJsonValue({
            agentType: "creative_studio",
            formatId: input.request.format.id,
            formatLabel: input.request.format.label,
            provider: input.request.modelKind,
            variantIndex: input.request.variantIndex,
            title: input.request.draft.title,
            prompt: input.request.prompt,
            rationale: input.request.draft.rationale,
            sourceUrl: input.storedAsset.sourceUrl,
            width: input.storedAsset.width,
            height: input.storedAsset.height,
            referenceImageUrl: input.request.referenceImageUrl
          })
        },
        select: {
          id: true
        }
      });

      return {
        assetId: asset.id
      };
    }
  };
}

async function resolveOrganizationId(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true }
  });

  if (!project) {
    throw new Error(`Projet introuvable: ${projectId}`);
  }

  return project.organizationId;
}

export async function executeCreativeStudioPipeline(
  context: CreativeStudioContext,
  overrides: Partial<CreativeStudioDependencies> = {}
): Promise<AgentPipelineResult> {
  const baseDependencies = createDefaultDependencies(context);
  const dependencies: CreativeStudioDependencies = {
    ...baseDependencies,
    ...overrides
  };
  const requestedFormats = extractRequestedFormats(context.parsedBrief);
  const variantsPerFormat = clampVariantCount(context.parsedBrief.agentDetails.deliverableCount, requestedFormats.length);
  const referenceImageUrls = extractReferenceImageUrls(context.parsedBrief);

  dependencies.log.info("Creative Studio démarrage", {
    jobId: context.jobId,
    projectId: context.projectId,
    requestedFormats: requestedFormats.map((format) => format.id),
    variantsPerFormat
  });

  await dependencies.updateProgress({
    stage: "brief_analysis",
    message: "Brief créatif analysé",
    requestedFormats: requestedFormats.map((format) => format.id)
  });

  let promptPlan: CreativePromptPlan;

  try {
    await dependencies.updateProgress({
      stage: "prompt_generation",
      message: "Génération des prompts via GPT",
      requestedFormats: requestedFormats.map((format) => format.id)
    });
    promptPlan = await dependencies.runTrackedStep(
      {
        jobId: context.jobId,
        agentType: "creative_studio",
        modelProvider: "openai",
        modelName: "gpt-5.4-mini"
      },
      async () =>
        dependencies.generatePromptPlan({
          parsedBrief: context.parsedBrief,
          formats: requestedFormats,
          variantsPerFormat
        })
    );
  } catch (error) {
    dependencies.log.warn("Fallback prompt plan utilisé", {
      jobId: context.jobId,
      errorMessage: error instanceof Error ? error.message : "Erreur inconnue"
    });
    promptPlan = buildFallbackPromptPlan(context.parsedBrief, requestedFormats, variantsPerFormat);
  }

  const normalizedPromptPlan = normalizePromptPlan(
    context.parsedBrief,
    requestedFormats,
    variantsPerFormat,
    promptPlan
  );
  const generationRequests = buildGenerationRequests(
    context.parsedBrief,
    requestedFormats,
    normalizedPromptPlan,
    referenceImageUrls
  );
  const organizationId = overrides.createAssetRecord ? null : await resolveOrganizationId(context.projectId);
  const createdAssets: CreativeExecutionAsset[] = [];

  await dependencies.updateProgress({
    stage: "image_generation",
    message: "Génération des variantes visuelles",
    requestedFormats: requestedFormats.map((format) => format.id),
    completedAssets: 0,
    totalAssets: generationRequests.length
  });

  for (const request of generationRequests) {
    dependencies.log.info("Creative Studio génération en cours", {
      formatId: request.format.id,
      variantIndex: request.variantIndex,
      provider: request.modelKind
    });

    const imageResult = await dependencies.runTrackedStep(
      {
        jobId: context.jobId,
        agentType: "creative_studio",
        modelProvider: "fal",
        modelName:
          request.modelKind === "flux_kontext"
            ? "fal-ai/flux-pro/kontext"
            : request.modelKind === "seedream_edit"
              ? "fal-ai/bytedance/seedream/v4.5/edit"
              : "fal-ai/bytedance/seedream/v4.5/text-to-image"
      },
      async () => dependencies.generateImage(request)
    );

    const primaryImage = imageResult.images[0];

    if (!primaryImage) {
      throw new Error(`Aucune image retournée pour ${request.format.id} variante ${request.variantIndex}.`);
    }

    const storedAsset = await dependencies.storeImage({
      context,
      request,
      image: primaryImage
    });
    const assetRecord =
      overrides.createAssetRecord !== undefined
        ? await dependencies.createAssetRecord({
            context,
            request,
            storedAsset
          })
        : await prisma.asset.create({
            data: {
              organizationId: organizationId ?? (await resolveOrganizationId(context.projectId)),
              projectId: context.projectId,
              jobId: context.jobId,
              assetType: "image",
              storageBucket: storedAsset.bucket,
              storagePath: storedAsset.path,
              mimeType: storedAsset.mimeType,
              sizeBytes: BigInt(storedAsset.sizeBytes),
              metadataJson: toJsonValue({
                agentType: "creative_studio",
                formatId: request.format.id,
                formatLabel: request.format.label,
                provider: request.modelKind,
                variantIndex: request.variantIndex,
                title: request.draft.title,
                prompt: request.prompt,
                rationale: request.draft.rationale,
                sourceUrl: storedAsset.sourceUrl,
                width: storedAsset.width,
                height: storedAsset.height,
                referenceImageUrl: request.referenceImageUrl
              })
            },
            select: {
              id: true
            }
          }).then((asset) => ({ assetId: asset.id }));

    createdAssets.push({
      assetId: assetRecord.assetId,
      formatId: request.format.id,
      formatLabel: request.format.label,
      variantIndex: request.variantIndex,
      title: request.draft.title,
      prompt: request.prompt,
      rationale: request.draft.rationale,
      provider: request.modelKind,
      width: storedAsset.width,
      height: storedAsset.height,
      storageBucket: storedAsset.bucket,
      storagePath: storedAsset.path,
      deliveryUrl: storedAsset.signedUrl,
      sourceUrl: storedAsset.sourceUrl,
      mimeType: storedAsset.mimeType,
      referenceImageUrl: request.referenceImageUrl
    });

    await dependencies.updateProgress({
      stage: "asset_packaging",
      message: `Asset ${createdAssets.length}/${generationRequests.length} prêt`,
      requestedFormats: requestedFormats.map((format) => format.id),
      completedAssets: createdAssets.length,
      totalAssets: generationRequests.length
    });
  }

  const assetsByFormat = createdAssets.reduce<Record<string, number>>((accumulator, asset) => {
    accumulator[asset.formatId] = (accumulator[asset.formatId] ?? 0) + 1;
    return accumulator;
  }, {});
  const logoGenerated = createdAssets.some((asset) => asset.formatId === "logo");

  return {
    summary: `Creative Studio a généré ${createdAssets.length} visuels marketing sur ${requestedFormats.length} format(s).`,
    outputs: {
      creativeStrategy: normalizedPromptPlan.creativeStrategy,
      requestedFormats: requestedFormats.map((format) => ({
        id: format.id,
        label: format.label,
        width: format.width,
        height: format.height
      })),
      variantsPerFormat,
      assetsByFormat,
      referenceImageUrls,
      logoGenerated,
      assets: createdAssets
    },
    qaChecklist: [
      "Vérifier l'alignement avec les guidelines de marque et les couleurs demandées",
      "Vérifier la lisibilité du texte inclus sur chaque format",
      "Vérifier la diversité créative et la qualité professionnelle des variantes"
    ],
    delivery: {
      type: "creative_package",
      status: "delivered",
      summaryText: `Package créatif prêt avec ${createdAssets.length} assets et ${requestedFormats.length} formats livrés.`
    }
  };
}

export const creativeStudioPipeline: AgentPipeline<"creative_studio"> = {
  agentType: "creative_studio",
  steps: [
    {
      key: "brief_analysis",
      label: "Analyse du brief",
      description: "Cadre le sujet, le style, les formats et les contraintes de marque."
    },
    {
      key: "prompt_generation",
      label: "Génération des prompts",
      description: "Produit des prompts visuels optimisés pour GPT puis fal.ai."
    },
    {
      key: "asset_packaging",
      label: "Production & packaging",
      description: "Génère, stocke et enregistre les visuels pour QA et livraison."
    }
  ],
  async execute(context) {
    return executeCreativeStudioPipeline(context);
  }
};