import { z, type ZodTypeAny } from "zod";
export interface GenerateTextOptions {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxOutputTokens?: number;
}
export interface TextGenerationUsage {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
}
export interface GenerateTextResult {
    text: string;
    model: string;
    usage: TextGenerationUsage;
}
export declare function generateTextResult(prompt: string, options?: GenerateTextOptions): Promise<GenerateTextResult>;
export declare function generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
export declare function parseJSONResult<TSchema extends ZodTypeAny>(prompt: string, schema: TSchema, options?: GenerateTextOptions): Promise<{
    data: z.infer<TSchema>;
    rawText: string;
    model: string;
    usage: TextGenerationUsage;
}>;
export declare function parseJSON<TSchema extends ZodTypeAny>(prompt: string, schema: TSchema, options?: GenerateTextOptions): Promise<z.infer<TSchema>>;
//# sourceMappingURL=openai.d.ts.map