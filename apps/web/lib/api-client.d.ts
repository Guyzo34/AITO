import type { Session, User } from "@supabase/supabase-js";
import type { BrandRecord, ClientContextResponse, DeliverablesResponse, JobRecord, ProjectCreatePayload, ProjectDetail, ProjectListItem } from "@/lib/types";
type AuthResponse = {
    user: User;
    session: Session;
};
type SignupResponse = AuthResponse & {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
};
type BriefPayload = {
    rawInputText: string;
    attachmentsJson?: unknown;
    parsedBriefJson?: unknown;
    status?: "submitted" | "parsed" | "needs_clarification" | "approved" | "archived";
};
type JobPayload = {
    briefId?: string;
    jobType: string;
    priority?: number;
};
type BrandPayload = {
    organizationId: string;
    name: string;
    websiteUrl?: string | null;
    industry?: string | null;
    targetAudience?: string | null;
    toneOfVoice?: string | null;
    brandGuidelinesJson?: unknown;
};
export declare const apiClient: {
    login(payload: {
        email: string;
        password: string;
    }): Promise<AuthResponse>;
    signup(payload: {
        email: string;
        password: string;
        fullName: string;
        organizationName: string;
        organizationSlug: string;
    }): Promise<SignupResponse>;
    logout(payload: {
        accessToken: string;
        refreshToken: string;
    }): Promise<{
        success: true;
    }>;
    resetPassword(email: string): Promise<{
        success: true;
    }>;
    getClientContext(accessToken: string): Promise<ClientContextResponse>;
    getProjects(accessToken: string, organizationId: string): Promise<ProjectListItem[]>;
    getProject(accessToken: string, projectId: string): Promise<ProjectDetail>;
    createProject(accessToken: string, payload: ProjectCreatePayload): Promise<ProjectDetail>;
    createBrief(accessToken: string, projectId: string, payload: BriefPayload): Promise<{
        id: string;
    }>;
    createJob(accessToken: string, projectId: string, payload: JobPayload): Promise<JobRecord>;
    getJob(accessToken: string, jobId: string): Promise<JobRecord>;
    retryJob(accessToken: string, jobId: string): Promise<JobRecord>;
    getProjectDeliverables(accessToken: string, projectId: string): Promise<DeliverablesResponse>;
    createBrand(accessToken: string, payload: BrandPayload): Promise<BrandRecord>;
    updateBrand(accessToken: string, brandId: string, payload: BrandPayload): Promise<BrandRecord>;
};
export {};
//# sourceMappingURL=api-client.d.ts.map