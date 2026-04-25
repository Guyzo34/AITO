import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"shop_builder">;
export declare function executeShopBuilderPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const shopBuilderPipeline: AgentPipeline<"shop_builder">;
export {};
//# sourceMappingURL=shop-builder.d.ts.map