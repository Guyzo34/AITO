import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type PaidMediaContext = AgentPipelineContext<"paid_media">;
export declare function executePaidMediaPipeline(context: PaidMediaContext): Promise<AgentPipelineResult>;
export declare const paidMediaPipeline: AgentPipeline<"paid_media">;
export {};
//# sourceMappingURL=paid-media.d.ts.map