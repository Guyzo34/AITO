const defaultFalBaseUrl = "https://fal.run";

const FLUX_KONTEXT_PRO_MODEL = "fal-ai/flux-pro/kontext";
const SEEDREAM_V4_TEXT_MODEL = "fal-ai/bytedance/seedream/v4.5/text-to-image";
const SEEDREAM_V4_EDIT_MODEL = "fal-ai/bytedance/seedream/v4.5/edit";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;

// ─── Public types ─────────────────────────────────────────────────────────────

export type SeedreamImageSize =
  | "square_hd"
  | "square"
  | "portrait_16_9"
  | "landscape_16_9"
  | "portrait_4_3"
  | "landscape_4_3";

export type FalAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9" | "2:3" | "3:2";

export interface FalImage {
  url: string;
  width: number;
  height: number;
  contentType: string | null;
}

export interface FalImageResult {
  requestId: string;
  images: FalImage[];
  rawResponse: unknown;
}

export interface FalLogger {
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
}

export interface FalClientConfig {
  apiKey?: string;
  baseUrl?: string;
  logger?: FalLogger;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface GenerateFluxKontextInput {
  prompt: string;
  imageUrl: string;
  aspectRatio?: FalAspectRatio;
  numImages?: number;
  outputFormat?: "jpeg" | "png";
  enhancePrompt?: boolean;
}

export interface GenerateSeedreamEditInput {
  prompt: string;
  imageUrls: string[];
  imageSize?: SeedreamImageSize;
  numImages?: number;
}

export interface GenerateSeedreamTextToImageInput {
  prompt: string;
  imageSize?: SeedreamImageSize;
  numImages?: number;
}

// ─── FalClient interface ──────────────────────────────────────────────────────

export interface FalClient {
  generateFluxKontext(input: GenerateFluxKontextInput): Promise<FalImageResult>;
  generateSeedreamEdit(input: GenerateSeedreamEditInput): Promise<FalImageResult>;
  generateSeedreamTextToImage(input: GenerateSeedreamTextToImageInput): Promise<FalImageResult>;
}

// ─── Backward-compatible types (kept for existing code) ───────────────────────

export interface GenerateImageOptions {
  model?: string;
  imageSize?: SeedreamImageSize;
  numImages?: number;
  outputFormat?: "jpeg" | "png";
  guidanceScale?: number;
  numInferenceSteps?: number;
}

export interface GenerateImageResult {
  model: string;
  prompt: string;
  images: Array<{
    url: string;
    contentType: string | null;
  }>;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface FalInternalConfig {
  apiKey: string;
  baseUrl: string;
}

interface FalApiImageShape {
  url?: string;
  width?: number;
  height?: number;
  content_type?: string;
}

interface FalApiResponse {
  request_id?: string;
  images?: FalApiImageShape[];
  prompt?: string;
}

// ─── Config helpers ───────────────────────────────────────────────────────────

function getFalInternalConfig(apiKeyOverride?: string, baseUrlOverride?: string): FalInternalConfig {
  const apiKey = apiKeyOverride ?? process.env.FAL_KEY;

  if (!apiKey) {
    throw new Error("FAL_KEY est requis pour utiliser la génération d'images fal.ai.");
  }

  return {
    apiKey,
    baseUrl: baseUrlOverride ?? process.env.FAL_BASE_URL ?? defaultFalBaseUrl
  };
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("503") ||
    error.message.includes("502") ||
    error.message.includes("429") ||
    error.message.includes("500") ||
    error.message.toLowerCase().includes("timeout")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
  logger?: FalLogger,
  context?: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      logger?.warn(`fal.ai retry attempt ${attempt}/${maxAttempts}${context ? ` for ${context}` : ""}`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryMs: delay
      });

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw lastError;
}

// ─── Low-level HTTP ───────────────────────────────────────────────────────────

async function falPost(
  config: FalInternalConfig,
  model: string,
  body: Record<string, unknown>
): Promise<FalApiResponse> {
  const response = await fetch(`${config.baseUrl}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...body, sync_mode: true })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`fal.ai a répondu avec ${response.status}: ${errorBody}`);
  }

  return (await response.json()) as FalApiResponse;
}

function parseFalApiResponse(payload: FalApiResponse, model: string): FalImageResult {
  const images = (payload.images ?? [])
    .map((image): FalImage | null => {
      if (!image.url) {
        return null;
      }

      return {
        url: image.url,
        width: image.width ?? 0,
        height: image.height ?? 0,
        contentType: image.content_type ?? null
      };
    })
    .filter((image): image is FalImage => image !== null);

  if (images.length === 0) {
    throw new Error(`fal.ai (${model}) n'a retourné aucune image exploitable.`);
  }

  return {
    requestId: payload.request_id ?? "",
    images,
    rawResponse: payload
  };
}

// ─── createFalClient factory ───────────────────────────────────────────────────

export function createFalClient(config: FalClientConfig = {}): FalClient {
  const internalConfig = getFalInternalConfig(config.apiKey, config.baseUrl);
  const logger = config.logger;

  function runWithRetry<T>(model: string, fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS, logger, model);
  }

  return {
    async generateFluxKontext(input) {
      logger?.info("fal.ai: génération Flux Kontext Pro", {
        prompt: input.prompt.slice(0, 80)
      });

      return runWithRetry(FLUX_KONTEXT_PRO_MODEL, async () => {
        const payload = await falPost(internalConfig, FLUX_KONTEXT_PRO_MODEL, {
          prompt: input.prompt,
          image_url: input.imageUrl,
          aspect_ratio: input.aspectRatio ?? "1:1",
          num_images: input.numImages ?? 1,
          output_format: input.outputFormat ?? "png",
          enable_safety_checker: false,
          ...(input.enhancePrompt !== undefined ? { enhance_prompt: input.enhancePrompt } : {})
        });

        return parseFalApiResponse(payload, FLUX_KONTEXT_PRO_MODEL);
      });
    },

    async generateSeedreamEdit(input) {
      logger?.info("fal.ai: génération Seedream edit", {
        prompt: input.prompt.slice(0, 80)
      });

      return runWithRetry(SEEDREAM_V4_EDIT_MODEL, async () => {
        const payload = await falPost(internalConfig, SEEDREAM_V4_EDIT_MODEL, {
          prompt: input.prompt,
          image_urls: input.imageUrls,
          image_size: input.imageSize ?? "square_hd",
          num_images: input.numImages ?? 1
        });

        return parseFalApiResponse(payload, SEEDREAM_V4_EDIT_MODEL);
      });
    },

    async generateSeedreamTextToImage(input) {
      logger?.info("fal.ai: génération Seedream text-to-image", {
        prompt: input.prompt.slice(0, 80)
      });

      return runWithRetry(SEEDREAM_V4_TEXT_MODEL, async () => {
        const payload = await falPost(internalConfig, SEEDREAM_V4_TEXT_MODEL, {
          prompt: input.prompt,
          image_size: input.imageSize ?? "square_hd",
          num_images: input.numImages ?? 1
        });

        return parseFalApiResponse(payload, SEEDREAM_V4_TEXT_MODEL);
      });
    }
  };
}

// ─── Backward-compatible generateImage function ───────────────────────────────

export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const config = getFalInternalConfig();
  const model = options.model ?? "fal-ai/flux/dev";

  const response = await fetch(`${config.baseUrl}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      image_size: options.imageSize ?? "landscape_16_9",
      num_images: options.numImages ?? 1,
      output_format: options.outputFormat ?? "png",
      guidance_scale: options.guidanceScale ?? 3.5,
      num_inference_steps: options.numInferenceSteps ?? 28,
      sync_mode: true,
      enable_safety_checker: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`fal.ai a répondu avec ${response.status}: ${errorBody}`);
  }

  const payload = (await response.json()) as FalApiResponse;
  const images = (payload.images ?? [])
    .map((image) => {
      if (!image.url) {
        return null;
      }

      return {
        url: image.url,
        contentType: image.content_type ?? null
      };
    })
    .filter((image): image is { url: string; contentType: string | null } => image !== null);

  if (images.length === 0) {
    throw new Error("fal.ai n'a retourné aucune image exploitable.");
  }

  return {
    model,
    prompt: payload.prompt ?? prompt,
    images
  };
}
