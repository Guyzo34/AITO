import { type ParsedBriefJson, type WorkflowJobPayload } from "@agents-marketing/types";
export interface OrchestratorResult {
    parsedBrief: ParsedBriefJson;
    agentSummary: string;
    qaReportId: string;
    deliveryId: string;
}
export declare function runWorkflow(input: WorkflowJobPayload): Promise<OrchestratorResult>;
//# sourceMappingURL=orchestrator.d.ts.map