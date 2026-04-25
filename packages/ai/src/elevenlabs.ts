const defaultElevenLabsBaseUrl = "https://api.elevenlabs.io/v1";
const defaultOutputFormat = "mp3_44100_128";
const defaultMultilingualModel = "eleven_multilingual_v2";

export interface ElevenLabsVoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ElevenLabsVoiceDescriptor {
  id: string;
  name: string;
  languages: string[];
  tones: string[];
  description: string;
  modelId: string;
  outputFormat: string;
  voiceSettings: Required<ElevenLabsVoiceSettings>;
}

export interface ElevenLabsSynthesisOptions {
  text: string;
  language: string;
  voice: ElevenLabsVoiceDescriptor;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
}

export interface ElevenLabsSynthesisResult {
  audioBuffer: Buffer;
  format: string;
  contentType: string;
  language: string;
  voiceId: string;
  voiceName: string;
  modelId: string;
  characterCount: number;
  durationSeconds: number;
}

interface ElevenLabsClientConfig {
  apiKey: string;
  baseUrl: string;
}

const elevenLabsVoiceCatalog: ElevenLabsVoiceDescriptor[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    languages: ["en", "fr"],
    tones: ["professional", "warm", "clear", "premium", "chaleureux"],
    description: "Voix posée et premium pour présentations de marque et vidéos explicatives.",
    modelId: defaultMultilingualModel,
    outputFormat: defaultOutputFormat,
    voiceSettings: {
      stability: 0.55,
      similarityBoost: 0.82,
      style: 0.3,
      useSpeakerBoost: true
    }
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    languages: ["en", "fr"],
    tones: ["warm", "friendly", "soft", "witty", "chaleureux"],
    description: "Voix expressive et rassurante pour intros YouTube et contenus pédagogiques.",
    modelId: defaultMultilingualModel,
    outputFormat: defaultOutputFormat,
    voiceSettings: {
      stability: 0.48,
      similarityBoost: 0.78,
      style: 0.45,
      useSpeakerBoost: true
    }
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    languages: ["en", "fr"],
    tones: ["dynamic", "confident", "bold", "dynamique", "impactant"],
    description: "Voix énergique pour publicités, trailers et hooks marketing.",
    modelId: defaultMultilingualModel,
    outputFormat: defaultOutputFormat,
    voiceSettings: {
      stability: 0.42,
      similarityBoost: 0.8,
      style: 0.7,
      useSpeakerBoost: true
    }
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    languages: ["en", "fr"],
    tones: ["professional", "authoritative", "serious", "professionnel", "institutionnel"],
    description: "Voix crédible pour corporate, démonstrations et messages institutionnels.",
    modelId: defaultMultilingualModel,
    outputFormat: defaultOutputFormat,
    voiceSettings: {
      stability: 0.62,
      similarityBoost: 0.79,
      style: 0.22,
      useSpeakerBoost: true
    }
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    languages: ["en", "fr"],
    tones: ["upbeat", "dynamic", "friendly", "dynamique", "souriant"],
    description: "Voix vive pour contenus sociaux, promos et vidéos courtes.",
    modelId: defaultMultilingualModel,
    outputFormat: defaultOutputFormat,
    voiceSettings: {
      stability: 0.46,
      similarityBoost: 0.76,
      style: 0.62,
      useSpeakerBoost: true
    }
  }
];

function getElevenLabsClientConfig(): ElevenLabsClientConfig {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY est requis pour générer un voiceover.");
  }

  return {
    apiKey,
    baseUrl: process.env.ELEVENLABS_BASE_URL ?? defaultElevenLabsBaseUrl
  };
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.startsWith("fr")) {
    return "fr";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return normalized.slice(0, 2) || "en";
}

function tokenizeTone(tone: string | null | undefined): string[] {
  if (!tone) {
    return [];
  }

  return tone
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function clampVoiceSetting(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(3))));
}

function buildVoiceSettings(
  voice: ElevenLabsVoiceDescriptor,
  requestedTone: string | null | undefined,
  overrides?: ElevenLabsVoiceSettings
): Required<ElevenLabsVoiceSettings> {
  const tokens = tokenizeTone(requestedTone);
  const base = { ...voice.voiceSettings };

  if (tokens.some((token) => ["dynamic", "dynamique", "impactant", "upbeat"].includes(token))) {
    base.stability = clampVoiceSetting(base.stability - 0.08);
    base.style = clampVoiceSetting(base.style + 0.18);
  }

  if (tokens.some((token) => ["warm", "chaleureux", "friendly", "soft"].includes(token))) {
    base.stability = clampVoiceSetting(base.stability + 0.05);
    base.style = clampVoiceSetting(base.style + 0.08);
  }

  if (tokens.some((token) => ["professional", "professionnel", "authoritative", "serious"].includes(token))) {
    base.stability = clampVoiceSetting(base.stability + 0.07);
    base.style = clampVoiceSetting(base.style - 0.05);
  }

  return {
    stability: clampVoiceSetting(overrides?.stability ?? base.stability),
    similarityBoost: clampVoiceSetting(overrides?.similarityBoost ?? base.similarityBoost),
    style: clampVoiceSetting(overrides?.style ?? base.style),
    useSpeakerBoost: overrides?.useSpeakerBoost ?? base.useSpeakerBoost
  };
}

function getAudioContentType(outputFormat: string): string {
  if (outputFormat.startsWith("mp3_")) {
    return "audio/mpeg";
  }

  if (outputFormat.startsWith("pcm_")) {
    return "audio/wav";
  }

  return "application/octet-stream";
}

function estimateDurationSeconds(byteLength: number, outputFormat: string, fallbackChars: number): number {
  const parts = outputFormat.split("_");

  if (parts[0] === "mp3" && parts[2]) {
    const bitrate = Number(parts[2]);

    if (Number.isFinite(bitrate) && bitrate > 0) {
      return Number(((byteLength * 8) / (bitrate * 1000)).toFixed(2));
    }
  }

  return Number((fallbackChars / 18).toFixed(2));
}

export function getElevenLabsCharacterLimit(modelId: string): number {
  switch (modelId) {
    case "eleven_v3":
      return 5000;
    case "eleven_flash_v2":
      return 30000;
    case "eleven_flash_v2_5":
      return 40000;
    case "eleven_multilingual_v1":
    case "eleven_multilingual_v2":
    case "eleven_english_sts_v1":
    case "eleven_english_sts_v2":
    default:
      return 10000;
  }
}

export function chunkTextForElevenLabs(text: string, maxCharacters: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxCharacters) {
    return [normalized];
  }

  const sentences = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  const flush = () => {
    const trimmed = currentChunk.trim();

    if (trimmed) {
      chunks.push(trimmed);
    }

    currentChunk = "";
  };

  const pushSentence = (sentence: string) => {
    if (!sentence) {
      return;
    }

    if (sentence.length > maxCharacters) {
      const words = sentence.split(/\s+/);
      let segment = "";

      for (const word of words) {
        const candidate = segment ? `${segment} ${word}` : word;

        if (candidate.length > maxCharacters) {
          if (segment) {
            chunks.push(segment);
            segment = word;
            continue;
          }

          chunks.push(word.slice(0, maxCharacters));
          const remainder = word.slice(maxCharacters).trim();

          if (remainder) {
            pushSentence(remainder);
          }

          return;
        }

        segment = candidate;
      }

      if (segment) {
        chunks.push(segment);
      }

      return;
    }

    const candidate = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    if (candidate.length > maxCharacters) {
      flush();
      currentChunk = sentence;
      return;
    }

    currentChunk = candidate;
  };

  for (const sentence of sentences) {
    pushSentence(sentence);
  }

  flush();

  return chunks;
}

export function selectElevenLabsVoices(language: string, tone: string | null | undefined, limit = 3) {
  const normalizedLanguage = normalizeLanguage(language);
  const toneTokens = tokenizeTone(tone);

  return [...elevenLabsVoiceCatalog]
    .filter((voice) => voice.languages.includes(normalizedLanguage))
    .sort((left, right) => {
      const leftScore =
        toneTokens.filter((token) => left.tones.includes(token)).length + (left.languages.includes(normalizedLanguage) ? 1 : 0);
      const rightScore =
        toneTokens.filter((token) => right.tones.includes(token)).length + (right.languages.includes(normalizedLanguage) ? 1 : 0);

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export async function synthesizeSpeech(
  options: ElevenLabsSynthesisOptions
): Promise<ElevenLabsSynthesisResult> {
  const client = getElevenLabsClientConfig();
  const normalizedLanguage = normalizeLanguage(options.language);
  const modelId = options.modelId ?? options.voice.modelId;
  const outputFormat = options.outputFormat ?? options.voice.outputFormat;
  const url = new URL(`${client.baseUrl}/text-to-speech/${options.voice.id}`);

  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": client.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: options.text,
      model_id: modelId,
      language_code: normalizedLanguage,
      voice_settings: buildVoiceSettings(options.voice, undefined, options.voiceSettings)
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs a répondu avec ${response.status}: ${errorBody}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  return {
    audioBuffer,
    format: outputFormat,
    contentType: getAudioContentType(outputFormat),
    language: normalizedLanguage,
    voiceId: options.voice.id,
    voiceName: options.voice.name,
    modelId,
    characterCount: options.text.length,
    durationSeconds: estimateDurationSeconds(audioBuffer.byteLength, outputFormat, options.text.length)
  };
}