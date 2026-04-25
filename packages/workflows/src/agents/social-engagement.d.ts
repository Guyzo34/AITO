import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"social_engagement">;
export declare function executeSocialEngagementPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const socialEngagementPipeline: AgentPipeline<"social_engagement">;
export {};
//# sourceMappingURL=social-engagement.d.ts.map