import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"local_growth">;
export declare function executeLocalGrowthPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const localGrowthPipeline: AgentPipeline<"local_growth">;
export {};
//# sourceMappingURL=local-growth.d.ts.map