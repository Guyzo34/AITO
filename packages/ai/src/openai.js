import { z } from "zod";
const defaultOpenAiModel = "gpt-5.4-mini";
const defaultBaseUrl = "https://api.openai.com/v1";
function getOpenAiClientConfig() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY est requis pour utiliser le brief parser.");
    }
    return {
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL ?? defaultBaseUrl
    };
}
function extractTextFromResponse(payload) {
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === "string") {
        return content.trim();
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => part.text ?? "")
            .join("")
            .trim();
    }
    throw new Error("Réponse OpenAI invalide: contenu textuel introuvable.");
}
function extractJsonPayload(text) {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }
    const firstBraceIndex = text.search(/[\[{]/);
    if (firstBraceIndex === -1) {
        return text.trim();
    }
    return text.slice(firstBraceIndex).trim();
}
function extractUsage(payload) {
    return {
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
        totalTokens: payload.usage?.total_tokens ?? null
    };
}
export async function generateTextResult(prompt, options = {}) {
    const client = getOpenAiClientConfig();
    const model = options.model ?? defaultOpenAiModel;
    const response = await fetch(`${client.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${client.apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            temperature: options.temperature ?? 0.2,
            ...(options.maxOutputTokens ? { max_completion_tokens: options.maxOutputTokens } : {}),
            messages: [
                ...(options.systemPrompt
                    ? [
                        {
                            role: "system",
                            content: options.systemPrompt
                        }
                    ]
                    : []),
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI a répondu avec ${response.status}: ${errorBody}`);
    }
    const payload = (await response.json());
    return {
        text: extractTextFromResponse(payload),
        model: payload.model ?? model,
        usage: extractUsage(payload)
    };
}
export async function generateText(prompt, options = {}) {
    const result = await generateTextResult(prompt, options);
    return result.text;
}
export async function parseJSONResult(prompt, schema, options = {}) {
    const schemaJson = JSON.stringify(z.toJSONSchema(schema), null, 2);
    const result = await generateTextResult(`${prompt}\n\nRetourne uniquement un JSON valide qui respecte exactement ce schéma:\n${schemaJson}`, {
        ...options,
        systemPrompt: [
            "Tu transformes des briefs métier en JSON strictement valide.",
            "Réponds uniquement avec du JSON sans markdown.",
            options.systemPrompt
        ]
            .filter(Boolean)
            .join("\n")
    });
    const jsonPayload = extractJsonPayload(result.text);
    const parsed = JSON.parse(jsonPayload);
    return {
        data: schema.parse(parsed),
        rawText: result.text,
        model: result.model,
        usage: result.usage
    };
}
export async function parseJSON(prompt, schema, options = {}) {
    const result = await parseJSONResult(prompt, schema, options);
    return result.data;
}
