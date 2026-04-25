import type { AgentType, ParsedBriefByAgentType } from "@agents-marketing/types";

export interface AgentPipelineStepDefinition {
  key: string;
  label: string;
  description: string;
}

export interface AgentPipelineContext<TAgentType extends AgentType = AgentType> {
  jobId: string;
  projectId: string;
  briefId: string;
  organizationId: string;
  agentType: TAgentType;
  parsedBrief: ParsedBriefByAgentType<TAgentType>;
}

export interface AgentPipelineResult {
  summary: string;
  outputs: Record<string, unknown>;
  qaChecklist: string[];
  executionMetadata?: {
    modelProvider: string;
    modelName: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    estimatedCostUsd?: number | null;
  };
  delivery: {
    type: string;
    summaryText: string;
    status: string;
  };
}

export interface AgentPipeline<TAgentType extends AgentType = AgentType> {
  agentType: TAgentType;
  steps: AgentPipelineStepDefinition[];
  execute(context: AgentPipelineContext<TAgentType>): Promise<AgentPipelineResult>;
}