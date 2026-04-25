import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"social_monetization">;
export declare function executeSocialMonetizationPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const socialMonetizationPipeline: AgentPipeline<"social_monetization">;
export {};
//# sourceMappingURL=social-monetization.d.ts.map