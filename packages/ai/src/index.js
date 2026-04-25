export function listAiProviders() {
    return [
        { name: "openai", enabled: Boolean(process.env.OPENAI_API_KEY) },
        { name: "fal", enabled: Boolean(process.env.FAL_KEY) },
        { name: "elevenlabs", enabled: Boolean(process.env.ELEVENLABS_API_KEY) }
    ];
}
export * from "./openai.js";
export * from "./fal.js";
export * from "./elevenlabs.js";
