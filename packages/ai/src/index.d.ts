export type AiProviderName = "openai" | "fal" | "elevenlabs";
export interface AiProviderDescriptor {
    name: AiProviderName;
    enabled: boolean;
}
export declare function listAiProviders(): AiProviderDescriptor[];
export * from "./openai.js";
export * from "./fal.js";
export * from "./elevenlabs.js";
//# sourceMappingURL=index.d.ts.map