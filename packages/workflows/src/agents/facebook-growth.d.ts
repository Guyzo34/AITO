import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"facebook_growth">;
export declare function executeFacebookGrowthPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const facebookGrowthPipeline: AgentPipeline<"facebook_growth">;
export {};
//# sourceMappingURL=facebook-growth.d.ts.map