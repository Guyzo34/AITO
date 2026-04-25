import { Prisma, prisma } from "@agents-marketing/db";
import { parseJSON, selectElevenLabsVoices, synthesizeSpeech, getElevenLabsCharacterLimit, chunkTextForElevenLabs, type ElevenLabsVoiceDescriptor } from "@agents-marketing/ai";
import { z } from "zod";
import type { AgentPipeline } from "./types.js";

const voiceoverStorageBucket = "voiceovers";
const openAiVoiceoverModel = "gpt-5.4-mini";

const voiceoverScriptSchema = z.object({
  title: z.string().trim().min(1),
  script: z.string().trim().min(1),
  hook: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  estimatedDurationSeconds: z.number().positive(),
  pacingNotes: z.array(z.string().trim().min(1)).default([])
});

interface VoiceoverVariantSegment {
  assetId: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  format: string;
  sizeBytes: number;
  durationSeconds: number;
  chunkIndex: number;
  characterCount: number;
}

interface VoiceoverVariantResult {
  variantId: string;
  label: string;
  voiceId: string;
  voiceName: string;
  description: string;
  language: string;
  format: string;
  modelId: string;
  durationSeconds: number;
  segmentCount: number;
  segments: VoiceoverVariantSegment[];
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function sanitizeStorageToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "voiceover";
}

function normalizeLanguage(language: string | null | undefined): string {
  const raw = (language ?? "").trim().toLowerCase();

  if (raw.startsWith("fr")) {
    return "fr";
  }

  if (raw.startsWith("en")) {
    return "en";
  }

  return raw || "fr";
}

function getWordRate(language: string): number {
  return language === "fr" ? 145 : 155;
}

function resolveTargetDurationSeconds(durationSeconds: number | null | undefined): number {
  if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return durationSeconds;
  }

  return 45;
}

function estimateTargetWords(language: string, durationSeconds: number): number {
  return Math.max(40, Math.round((getWordRate(language) * durationSeconds) / 60));
}

function getSupabaseStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour stocker les voiceovers.");
  }

  return {
    supabaseUrl,
    serviceRoleKey
  };
}

async function uploadAudioToSupabase(
  path: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const config = getSupabaseStorageConfig();
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/${voiceoverStorageBucket}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.serviceRoleKey}`,
        apikey: config.serviceRoleKey,
        "x-upsert": "true",
        "Content-Type": contentType
      },
      body
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload Supabase échoué (${response.status}): ${errorBody}`);
  }
}

async function createProviderRun(
  jobId: string,
  modelProvider: "openai" | "elevenlabs",
  modelName: string
) {
  return prisma.agentRun.create({
    data: {
      jobId,
      agentType: "voiceover",
      modelProvider,
      modelName,
      status: "running",
      startedAt: new Date()
    }
  });
}

async function completeProviderRun(
  runId: string,
  status: "completed" | "failed",
  data?: Partial<{
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: Prisma.Decimal;
  }>
): Promise<void> {
  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      ...(typeof data?.inputTokens === "number" ? { inputTokens: data.inputTokens } : {}),
      ...(typeof data?.outputTokens === "number" ? { outputTokens: data.outputTokens } : {}),
      ...(data?.estimatedCostUsd ? { estimatedCostUsd: data.estimatedCostUsd } : {})
    }
  });
}

async function generateVoiceoverScript(
  context: Parameters<AgentPipeline<"voiceover">["execute"]>[0]
) {
  const language = normalizeLanguage(
    context.parsedBrief.agentDetails.language ?? context.parsedBrief.locale
  );
  const targetDurationSeconds = resolveTargetDurationSeconds(
    context.parsedBrief.agentDetails.durationSeconds
  );
  const targetWords = estimateTargetWords(language, targetDurationSeconds);
  const desiredTone =
    context.parsedBrief.agentDetails.desiredTone ??
    context.parsedBrief.agentDetails.voiceStyle ??
    context.parsedBrief.tone;
  const openAiRun = await createProviderRun(context.jobId, "openai", openAiVoiceoverModel);

  try {
    const result = await parseJSON(
      [
        "Tu es un auteur-réalisateur spécialisé en scripts de voix off marketing.",
        `Langue cible: ${language === "fr" ? "français" : "anglais"}`,
        `Durée cible: ${targetDurationSeconds} secondes`,
        `Volume cible: environ ${targetWords} mots`,
        `Ton souhaité: ${desiredTone ?? "professionnel"}`,
        `Usage: ${context.parsedBrief.agentDetails.usage ?? "vidéo marketing"}`,
        `Sujet/message principal: ${context.parsedBrief.agentDetails.messageSubject ?? context.parsedBrief.summary}`,
        "",
        "Brief structuré:",
        JSON.stringify(context.parsedBrief, null, 2),
        "",
        "Consignes de rédaction:",
        "- Écris une voix off prête à enregistrer, fluide à l'oral et sans listes.",
        "- Soigne le hook initial, le rythme, les respirations implicites et la clarté.",
        "- Respecte strictement la langue demandée.",
        "- Adapte la longueur à la durée cible avec une marge max de 10%.",
        "- Évite les formulations robotisées et les répétitions.",
        "- Si un call to action est pertinent, intègre-le naturellement à la fin."
      ].join("\n"),
      voiceoverScriptSchema,
      {
        model: openAiVoiceoverModel,
        temperature: 0.6,
        maxOutputTokens: 1400,
        systemPrompt: "Tu produis des scripts de voix off premium, crédibles et immédiatement exploitables."
      }
    );

    await completeProviderRun(openAiRun.id, "completed", {
      inputTokens: Math.ceil(JSON.stringify(context.parsedBrief).length / 4),
      outputTokens: Math.ceil(result.script.length / 4)
    });

    return result;
  } catch (error) {
    await completeProviderRun(openAiRun.id, "failed");
    throw error;
  }
}

async function createAudioAsset(
  organizationId: string,
  projectId: string,
  jobId: string,
  metadata: {
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    language: string;
    voiceId: string;
    voiceName: string;
    format: string;
    durationSeconds: number;
    variantLabel: string;
    chunkIndex: number;
    segmentCount: number;
    characterCount: number;
  }
) {
  return prisma.asset.create({
    data: {
      organizationId,
      projectId,
      jobId,
      assetType: "audio",
      storageBucket: voiceoverStorageBucket,
      storagePath: metadata.storagePath,
      mimeType: metadata.mimeType,
      sizeBytes: BigInt(metadata.sizeBytes),
      metadataJson: toJsonValue({
        language: metadata.language,
        voiceId: metadata.voiceId,
        voiceName: metadata.voiceName,
        format: metadata.format,
        durationSeconds: metadata.durationSeconds,
        variantLabel: metadata.variantLabel,
        chunkIndex: metadata.chunkIndex,
        segmentCount: metadata.segmentCount,
        characterCount: metadata.characterCount
      })
    }
  });
}

async function synthesizeVariant(
  context: Parameters<AgentPipeline<"voiceover">["execute"]>[0],
  voice: ElevenLabsVoiceDescriptor,
  variantIndex: number,
  script: string,
  requestedTone: string | null | undefined
): Promise<VoiceoverVariantResult> {
  const language = normalizeLanguage(
    context.parsedBrief.agentDetails.language ?? context.parsedBrief.locale
  );
  const characterLimit = getElevenLabsCharacterLimit(voice.modelId);
  const chunks = chunkTextForElevenLabs(script, characterLimit);
  const run = await createProviderRun(context.jobId, "elevenlabs", `${voice.modelId}:${voice.id}`);

  try {
    const segments: VoiceoverVariantSegment[] = [];
    let totalDurationSeconds = 0;

    for (const [chunkOffset, chunk] of chunks.entries()) {
      const audio = await synthesizeSpeech({
        text: chunk,
        language,
        voice,
        modelId: voice.modelId,
        outputFormat: voice.outputFormat
      });
      const extension = audio.format.startsWith("mp3_") ? "mp3" : "bin";
      const storagePath = [
        sanitizeStorageToken(context.projectId),
        sanitizeStorageToken(context.jobId),
        `variant-${variantIndex + 1}-${sanitizeStorageToken(voice.name)}`,
        `segment-${String(chunkOffset + 1).padStart(2, "0")}.${extension}`
      ].join("/");

      await uploadAudioToSupabase(storagePath, audio.audioBuffer, audio.contentType);

      const asset = await createAudioAsset(context.organizationId, context.projectId, context.jobId, {
        storagePath,
        mimeType: audio.contentType,
        sizeBytes: audio.audioBuffer.byteLength,
        language,
        voiceId: voice.id,
        voiceName: voice.name,
        format: audio.format,
        durationSeconds: audio.durationSeconds,
        variantLabel: `Version ${variantIndex + 1}`,
        chunkIndex: chunkOffset + 1,
        segmentCount: chunks.length,
        characterCount: chunk.length
      });

      totalDurationSeconds += audio.durationSeconds;
      segments.push({
        assetId: asset.id,
        storageBucket: voiceoverStorageBucket,
        storagePath,
        mimeType: audio.contentType,
        format: audio.format,
        sizeBytes: audio.audioBuffer.byteLength,
        durationSeconds: audio.durationSeconds,
        chunkIndex: chunkOffset + 1,
        characterCount: chunk.length
      });
    }

    await completeProviderRun(run.id, "completed", {
      inputTokens: script.length
    });

    return {
      variantId: `variant-${variantIndex + 1}`,
      label: `Version ${variantIndex + 1}`,
      voiceId: voice.id,
      voiceName: voice.name,
      description: voice.description,
      language,
      format: voice.outputFormat,
      modelId: voice.modelId,
      durationSeconds: Number(totalDurationSeconds.toFixed(2)),
      segmentCount: segments.length,
      segments
    };
  } catch (error) {
    await completeProviderRun(run.id, "failed");
    throw error;
  }
}

export const voiceoverPipeline: AgentPipeline<"voiceover"> = {
  agentType: "voiceover",
  steps: [
    {
      key: "script_generation",
      label: "Génération de script",
      description: "Rédige une voix off calibrée sur le message, la durée et le ton."
    },
    {
      key: "voice_synthesis",
      label: "Synthèse vocale",
      description: "Produit plusieurs variantes audio via ElevenLabs."
    },
    {
      key: "asset_delivery",
      label: "Livraison audio",
      description: "Stocke les assets audio, métadonnées et références de livraison."
    }
  ],
  async execute(context) {
    const requestedLanguage = normalizeLanguage(
      context.parsedBrief.agentDetails.language ?? context.parsedBrief.locale
    );
    const requestedTone =
      context.parsedBrief.agentDetails.desiredTone ??
      context.parsedBrief.agentDetails.voiceStyle ??
      context.parsedBrief.tone ??
      "professionnel";
    const generatedScript = await generateVoiceoverScript(context);
    const voices = selectElevenLabsVoices(requestedLanguage, requestedTone, 3);

    if (voices.length === 0) {
      throw new Error(`Aucune voix ElevenLabs compatible trouvée pour la langue ${requestedLanguage}.`);
    }

    const variants: VoiceoverVariantResult[] = [];

    for (const [index, voice] of voices.entries()) {
      variants.push(await synthesizeVariant(context, voice, index, generatedScript.script, requestedTone));
    }

    return {
      summary: `${variants.length} versions voiceover générées pour ${context.parsedBrief.title}.`,
      outputs: {
        script: generatedScript.script,
        hook: generatedScript.hook,
        rationale: generatedScript.rationale,
        estimatedDurationSeconds: generatedScript.estimatedDurationSeconds,
        targetDurationSeconds: resolveTargetDurationSeconds(
          context.parsedBrief.agentDetails.durationSeconds
        ),
        language: requestedLanguage,
        tone: requestedTone,
        usage: context.parsedBrief.agentDetails.usage,
        voices: variants.map((variant) => ({
          variantId: variant.variantId,
          label: variant.label,
          voiceId: variant.voiceId,
          voiceName: variant.voiceName,
          language: variant.language,
          format: variant.format,
          modelId: variant.modelId,
          durationSeconds: variant.durationSeconds,
          segmentCount: variant.segmentCount,
          segments: variant.segments
        }))
      },
      qaChecklist: [
        "Vérifier l’adéquation script / durée cible",
        "Vérifier la cohérence du ton demandé",
        "Vérifier la clarté de diction sur les trois voix",
        "Vérifier la présence et l’accessibilité des assets audio stockés"
      ],
      delivery: {
        type: "voiceover_package",
        status: "completed",
        summaryText: `${variants.length} versions audio ont été générées et stockées pour livraison.`
      }
    };
  }
};