import { parseJSON } from "@agents-marketing/ai";
import { agentTypeSchema, parsedBriefSchema } from "@agents-marketing/types";
import { z } from "zod";
const briefParserInputSchema = z.object({
    rawInputText: z.string().trim().min(1),
    agentType: agentTypeSchema,
    clientMemory: z.custom()
});
function formatClientMemory(clientMemory) {
    return JSON.stringify(clientMemory, null, 2);
}
function getAgentSpecificInstructions(agentType) {
    if (agentType === "website_builder") {
        return [
            "- Pour website_builder, renseigne si possible: siteType, businessSector, targetAudienceDescription, primaryCta, existingContent et styleTone.",
            "- Si le brief mentionne des pages ou sections, répartis-les entre requiredPages et siteMapSections.",
            "- Les éléments de copy ou assets déjà fournis doivent apparaître dans existingContent."
        ];
    }
    return [];
}
function buildPrompt(input) {
    return [
        `Type d'agent demandé : ${input.agentType}`,
        "",
        "Brief client brut :",
        input.rawInputText,
        "",
        "Mémoire client à prendre en compte :",
        formatClientMemory(input.clientMemory),
        "",
        "Instructions :",
        "- Structure le brief en JSON exploitable par un orchestrateur métier.",
        "- Déduis les informations manquantes seulement si le contexte le permet clairement.",
        "- Si une information reste absente, ajoute-la dans missingInformation.",
        "- Réutilise les préférences et contraintes de marque dans les champs pertinents.",
        "- Laisse les champs non déterminables à null ou à des tableaux vides selon le schéma.",
        ...getAgentSpecificInstructions(input.agentType)
    ].join("\n");
}
// Ce module centralise la transformation du brief brut en brief structuré.
export async function parseBrief(input) {
    const validatedInput = briefParserInputSchema.parse(input);
    const parsed = await parseJSON(buildPrompt(validatedInput), parsedBriefSchema, {
        model: "gpt-5.4-mini",
        temperature: 0.1,
        maxOutputTokens: 2200,
        systemPrompt: "Tu es un brief parser senior pour un orchestrateur marketing multi-agents."
    });
    return parsedBriefSchema.parse({
        ...parsed,
        agentType: validatedInput.agentType,
        memoryContext: validatedInput.clientMemory
    });
}
