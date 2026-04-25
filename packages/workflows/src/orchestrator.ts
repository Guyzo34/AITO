import { Prisma, prisma } from "@agents-marketing/db";
import {
  clientMemoryContextSchema,
  workflowJobPayloadSchema,
  type AgentType,
  type ClientMemoryContext,
  type ParsedBriefJson,
  type WorkflowJobPayload
} from "@agents-marketing/types";
import { getAgentPipeline } from "./agents/index.js";
import { parseBrief } from "./brief-parser.js";

const workflowSteps = [
  { stepName: "brief_parsing", stepOrder: 1 },
  { stepName: "agent_execution", stepOrder: 2 },
  { stepName: "qa", stepOrder: 3 },
  { stepName: "delivery", stepOrder: 4 }
] as const;

export interface OrchestratorResult {
  parsedBrief: ParsedBriefJson;
  agentSummary: string;
  qaReportId: string;
  deliveryId: string;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return toJsonValue(value);
}

function summarizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

async function ensureWorkflowSteps(jobId: string): Promise<void> {
  for (const step of workflowSteps) {
    await prisma.jobStep.upsert({
      where: {
        jobId_stepOrder: {
          jobId,
          stepOrder: step.stepOrder
        }
      },
      update: {
        stepName: step.stepName,
        status: "pending",
        inputJson: Prisma.JsonNull,
        outputJson: Prisma.JsonNull,
        startedAt: null,
        finishedAt: null
      },
      create: {
        jobId,
        stepName: step.stepName,
        stepOrder: step.stepOrder,
        status: "pending"
      }
    });
  }
}

async function updateJobStep(
  jobId: string,
  stepOrder: number,
  data: Partial<{
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    inputJson: unknown;
    outputJson: unknown;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>
): Promise<void> {
  await prisma.jobStep.update({
    where: {
      jobId_stepOrder: {
        jobId,
        stepOrder
      }
    },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(data, "inputJson")
        ? { inputJson: toNullableJsonValue(data.inputJson ?? null) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(data, "outputJson")
        ? { outputJson: toNullableJsonValue(data.outputJson ?? null) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(data, "startedAt") ? { startedAt: data.startedAt ?? null } : {}),
      ...(Object.prototype.hasOwnProperty.call(data, "finishedAt") ? { finishedAt: data.finishedAt ?? null } : {})
    }
  });
}

async function runStep<TOutput>(
  jobId: string,
  stepOrder: number,
  input: unknown,
  handler: () => Promise<TOutput>
): Promise<TOutput> {
  await updateJobStep(jobId, stepOrder, {
    status: "running",
    inputJson: input,
    startedAt: new Date(),
    finishedAt: null,
    outputJson: null
  });

  try {
    const output = await handler();

    await updateJobStep(jobId, stepOrder, {
      status: "completed",
      outputJson: output,
      finishedAt: new Date()
    });

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    await updateJobStep(jobId, stepOrder, {
      status: "failed",
      outputJson: { errorMessage: message },
      finishedAt: new Date()
    });

    throw error;
  }
}

async function loadWorkflowJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      brief: true,
      project: {
        include: {
          brand: true
        }
      }
    }
  });

  if (!job) {
    throw new Error(`Job introuvable: ${jobId}`);
  }

  return job;
}

async function resolveBrief(jobId: string, projectId: string, briefId: string | null) {
  if (briefId) {
    const brief = await prisma.brief.findUnique({
      where: { id: briefId }
    });

    if (!brief) {
      throw new Error(`Brief introuvable pour le job ${jobId}.`);
    }

    return brief;
  }

  const latestBrief = await prisma.brief.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" }
  });

  if (!latestBrief) {
    throw new Error(`Aucun brief disponible pour le projet ${projectId}.`);
  }

  return latestBrief;
}

async function loadClientMemoryContext(
  organizationId: string,
  brand: {
    id: string;
    name: string;
    websiteUrl: string | null;
    industry: string | null;
    targetAudience: string | null;
    toneOfVoice: string | null;
    brandGuidelinesJson: Prisma.JsonValue | null;
  } | null
): Promise<ClientMemoryContext> {
  const entries = await prisma.clientMemoryEntry.findMany({
    where: {
      organizationId,
      OR: [{ brandId: brand?.id ?? null }, { brandId: null }]
    },
    orderBy: { createdAt: "desc" }
  });

  const context = clientMemoryContextSchema.parse({
    brand: {
      brandId: brand?.id ?? null,
      brandName: brand?.name ?? null,
      websiteUrl: brand?.websiteUrl ?? null,
      industry: brand?.industry ?? null,
      targetAudience: brand?.targetAudience ?? null,
      toneOfVoice: brand?.toneOfVoice ?? null,
      brandGuidelines: brand?.brandGuidelinesJson ?? null
    },
    facts: entries
      .filter((entry) => entry.memoryType === "fact")
      .map((entry) => `${entry.key}: ${summarizeValue(entry.valueJson)}`),
    preferences: entries
      .filter((entry) => entry.memoryType === "preference")
      .map((entry) => `${entry.key}: ${summarizeValue(entry.valueJson)}`),
    constraints: entries
      .filter((entry) => entry.memoryType === "constraint")
      .map((entry) => `${entry.key}: ${summarizeValue(entry.valueJson)}`),
    approvedExamples: entries
      .filter((entry) => entry.memoryType === "approved_copy" || entry.memoryType === "approved_visual")
      .map((entry) => `${entry.key}: ${summarizeValue(entry.valueJson)}`),
    entries: entries.map((entry) => ({
      id: entry.id,
      memoryType: entry.memoryType,
      key: entry.key,
      value: entry.valueJson,
      valueSummary: summarizeValue(entry.valueJson),
      source: entry.source,
      confidenceScore: entry.confidenceScore ? Number(entry.confidenceScore) : null
    }))
  });

  return context;
}

async function parseAndPersistBrief(
  jobId: string,
  brief: {
    id: string;
    rawInputText: string;
  },
  agentType: AgentType,
  clientMemory: ClientMemoryContext
): Promise<ParsedBriefJson> {
  const parsedBrief = await parseBrief({
    rawInputText: brief.rawInputText,
    agentType,
    clientMemory
  });

  await prisma.brief.update({
    where: { id: brief.id },
    data: {
      parsedBriefJson: toJsonValue(parsedBrief),
      status: "parsed"
    }
  });

  return parsedBrief;
}

async function executeAgentPipeline(
  jobId: string,
  projectId: string,
  organizationId: string,
  briefId: string,
  agentType: AgentType,
  parsedBrief: ParsedBriefJson
) {
  const pipeline = getAgentPipeline(agentType);
  const agentRun = await prisma.agentRun.create({
    data: {
      jobId,
      agentType,
      modelProvider: "workflow",
      modelName: `${pipeline.agentType}_pipeline`,
      status: "running",
      startedAt: new Date()
    }
  });

  try {
    const result = await pipeline.execute({
      jobId,
      projectId,
      briefId,
      organizationId,
      agentType,
      parsedBrief: parsedBrief as never
    });
    const executionMetadata = result.executionMetadata;

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        modelProvider: executionMetadata?.modelProvider ?? "internal",
        modelName: executionMetadata?.modelName ?? pipeline.agentType,
        ...(Object.prototype.hasOwnProperty.call(executionMetadata ?? {}, "inputTokens")
          ? { inputTokens: executionMetadata?.inputTokens ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(executionMetadata ?? {}, "outputTokens")
          ? { outputTokens: executionMetadata?.outputTokens ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(executionMetadata ?? {}, "estimatedCostUsd")
          ? {
              estimatedCostUsd:
                executionMetadata?.estimatedCostUsd === null
                  ? null
                  : new Prisma.Decimal(executionMetadata?.estimatedCostUsd ?? 0)
            }
          : {}),
        status: "completed",
        finishedAt: new Date()
      }
    });

    return result;
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        finishedAt: new Date()
      }
    });

    throw error;
  }
}

async function createQaReport(
  projectId: string,
  jobId: string,
  parsedBrief: ParsedBriefJson,
  agentResult: {
    summary: string;
    qaChecklist: string[];
    outputs: Record<string, unknown>;
  }
) {
  return prisma.qaReport.create({
    data: {
      projectId,
      jobId,
      score: new Prisma.Decimal(100),
      approved: true,
      checksJson: toJsonValue(
        agentResult.qaChecklist.map((label) => ({
          label,
          status: "pending_manual_review"
        }))
      ),
      issuesJson: toJsonValue([]),
      createdAt: new Date()
    }
  });
}

async function createDelivery(
  projectId: string,
  jobId: string,
  parsedBrief: ParsedBriefJson,
  agentResult: {
    delivery: {
      type: string;
      summaryText: string;
      status: string;
    };
    outputs: Record<string, unknown>;
  }
) {
  return prisma.delivery.create({
    data: {
      projectId,
      jobId,
      deliveryType: agentResult.delivery.type,
      summaryText: `${agentResult.delivery.summaryText}\nBrief: ${parsedBrief.title}${
        typeof agentResult.outputs.previewUrl === "string" ? `\nPreview: ${agentResult.outputs.previewUrl}` : ""
      }`,
      status: agentResult.delivery.status,
      deliveredAt: new Date()
    }
  });
}

// Cet orchestrateur pilote le flux complet d’un job worker.
export async function runWorkflow(input: WorkflowJobPayload): Promise<OrchestratorResult> {
  const payload = workflowJobPayloadSchema.parse(input);
  const workflowJob = await loadWorkflowJob(payload.jobId);
  const brief = await resolveBrief(workflowJob.id, workflowJob.projectId, workflowJob.briefId);
  const effectiveAgentType = workflowJob.project.agentType;

  if (effectiveAgentType !== payload.agentType) {
    console.warn(
      `Le payload annonce ${payload.agentType} mais le projet ${workflowJob.projectId} est configuré en ${effectiveAgentType}.`
    );
  }

  await ensureWorkflowSteps(workflowJob.id);
  await prisma.job.update({
    where: { id: workflowJob.id },
    data: {
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      errorMessage: null,
      attemptCount: {
        increment: 1
      }
    }
  });

  try {
    const clientMemory = await loadClientMemoryContext(
      workflowJob.project.organizationId,
      workflowJob.project.brand
    );

    const parsedBrief = await runStep(workflowJob.id, 1, {
      briefId: brief.id,
      agentType: effectiveAgentType
    }, async () => parseAndPersistBrief(workflowJob.id, brief, effectiveAgentType, clientMemory));

    const agentResult = await runStep(workflowJob.id, 2, {
      briefId: brief.id,
      parsedBriefTitle: parsedBrief.title,
      agentType: effectiveAgentType
    }, async () =>
      executeAgentPipeline(
        workflowJob.id,
        workflowJob.projectId,
        workflowJob.project.organizationId,
        brief.id,
        effectiveAgentType,
        parsedBrief
      )
    );

    const qaReport = await runStep(workflowJob.id, 3, {
      qaChecklist: agentResult.qaChecklist
    }, async () => createQaReport(workflowJob.projectId, workflowJob.id, parsedBrief, agentResult));

    const delivery = await runStep(workflowJob.id, 4, {
      deliveryType: agentResult.delivery.type
    }, async () => createDelivery(workflowJob.projectId, workflowJob.id, parsedBrief, agentResult));

    await prisma.job.update({
      where: { id: workflowJob.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        errorMessage: null
      }
    });

    return {
      parsedBrief,
      agentSummary: agentResult.summary,
      qaReportId: qaReport.id,
      deliveryId: delivery.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    await prisma.job.update({
      where: { id: workflowJob.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message
      }
    });

    console.error(`Échec du workflow pour le job ${workflowJob.id}`, error);
    throw error;
  }
}