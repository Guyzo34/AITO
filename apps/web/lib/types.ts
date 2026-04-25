import type {
  AgentType,
  BriefStatus,
  JobStatus,
  ProjectStatus
} from "@agents-marketing/types";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
};

export type BrandRecord = {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  targetAudience: string | null;
  toneOfVoice: string | null;
  brandGuidelinesJson: unknown;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export type ClientContextResponse = {
  organizations: OrganizationSummary[];
  currentOrganizationId: string | null;
  brands: BrandRecord[];
};

export type AssetRecord = {
  id: string;
  assetType: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  createdAt: string;
  downloadUrl?: string | null;
};

export type DeliveryRecord = {
  id: string;
  deliveryType: string;
  summaryText: string | null;
  status: string;
  deliveredAt: string | null;
};

export type BriefRecord = {
  id: string;
  rawInputText: string;
  attachmentsJson: unknown;
  parsedBriefJson: unknown;
  status: BriefStatus;
  createdAt: string;
};

export type JobStepRecord = {
  id: string;
  stepName: string;
  stepOrder: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  finishedAt: string | null;
};

export type JobRecord = {
  id: string;
  briefId: string | null;
  jobType: string;
  status: JobStatus;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  jobSteps: JobStepRecord[];
  agentRuns: Array<{ id: string }>;
  assets: AssetRecord[];
  deliveries: DeliveryRecord[];
  qaReports: Array<{ id: string }>;
};

export type ProjectListItem = {
  id: string;
  organizationId: string;
  brandId: string | null;
  agentType: AgentType;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  brand: BrandRecord | null;
  jobs: Array<Pick<JobRecord, "id" | "jobType" | "status" | "queuedAt">>;
};

export type ProjectDetail = ProjectListItem & {
  briefs: BriefRecord[];
  jobs: JobRecord[];
  assets: AssetRecord[];
  deliveries: DeliveryRecord[];
};

export type DeliverablesResponse = {
  assets: AssetRecord[];
  deliveries: DeliveryRecord[];
};

export type ProjectCreatePayload = {
  organizationId: string;
  brandId?: string;
  agentType: AgentType;
  title: string;
  status?: ProjectStatus;
};