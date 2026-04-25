import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"crm_loyalty">;
export declare function executeCrmLoyaltyPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const crmLoyaltyPipeline: AgentPipeline<"crm_loyalty">;
export {};
//# sourceMappingURL=crm-loyalty.d.ts.map