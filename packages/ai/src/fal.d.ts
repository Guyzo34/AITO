export type SeedreamImageSize = "square_hd" | "square" | "portrait_16_9" | "landscape_16_9" | "portrait_4_3" | "landscape_4_3";
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
export interface FalClient {
    generateFluxKontext(input: GenerateFluxKontextInput): Promise<FalImageResult>;
    generateSeedreamEdit(input: GenerateSeedreamEditInput): Promise<FalImageResult>;
    generateSeedreamTextToImage(input: GenerateSeedreamTextToImageInput): Promise<FalImageResult>;
}
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
export declare function createFalClient(config?: FalClientConfig): FalClient;
export declare function generateImage(prompt: string, options?: GenerateImageOptions): Promise<GenerateImageResult>;
//# sourceMappingURL=fal.d.ts.map