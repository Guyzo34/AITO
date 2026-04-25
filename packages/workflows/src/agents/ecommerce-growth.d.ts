import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"ecommerce_growth">;
export declare function executeEcommerceGrowthPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const ecommerceGrowthPipeline: AgentPipeline<"ecommerce_growth">;
export {};
//# sourceMappingURL=ecommerce-growth.d.ts.map