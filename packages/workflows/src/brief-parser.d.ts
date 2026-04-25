import { type AgentType, type ClientMemoryContext, type ParsedBriefJson } from "@agents-marketing/types";
export interface BriefParserInput {
    rawInputText: string;
    agentType: AgentType;
    clientMemory: ClientMemoryContext;
}
export declare function parseBrief(input: BriefParserInput): Promise<ParsedBriefJson>;
//# sourceMappingURL=brief-parser.d.ts.map