import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"membership_builder">;
export declare function executeMembershipBuilderPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const membershipBuilderPipeline: AgentPipeline<"membership_builder">;
export {};
//# sourceMappingURL=membership-builder.d.ts.map