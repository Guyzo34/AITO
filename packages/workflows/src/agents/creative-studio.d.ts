import { type FalAspectRatio, type FalImageResult, type SeedreamImageSize } from "@agents-marketing/ai";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
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
export declare function executeCreativeStudioPipeline(context: CreativeStudioContext, overrides?: Partial<CreativeStudioDependencies>): Promise<AgentPipelineResult>;
export declare const creativeStudioPipeline: AgentPipeline<"creative_studio">;
export {};
//# sourceMappingURL=creative-studio.d.ts.map