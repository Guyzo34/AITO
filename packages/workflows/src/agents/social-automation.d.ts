import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";
type Context = AgentPipelineContext<"social_automation">;
export declare function executeSocialAutomationPipeline(context: Context): Promise<AgentPipelineResult>;
export declare const socialAutomationPipeline: AgentPipeline<"social_automation">;
export {};
//# sourceMappingURL=social-automation.d.ts.map