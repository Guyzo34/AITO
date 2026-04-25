import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"funnel_builder">;
export declare function executeFunnelBuilderPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const funnelBuilderPipeline: AgentPipeline<"funnel_builder">;
export {};
//# sourceMappingURL=funnel-builder.d.ts.map