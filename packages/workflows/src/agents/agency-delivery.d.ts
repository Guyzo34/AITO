import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"agency_delivery">;
export declare function executeAgencyDeliveryPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const agencyDeliveryPipeline: AgentPipeline<"agency_delivery">;
export {};
//# sourceMappingURL=agency-delivery.d.ts.map