import { env } from "@/lib/env";
async function request(path, options = {}) {
    const init = {
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options.accessToken
                ? {
                    Authorization: `Bearer ${options.accessToken}`
                }
                : {})
        }
    };
    if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
    }
    const response = await fetch(`${env.apiUrl}${path}`, init);
    const payload = (await response.json().catch(() => null));
    if (!response.ok) {
        throw new Error(payload?.error ?? "Une erreur réseau est survenue.");
    }
    return payload;
}
export const apiClient = {
    login(payload) {
        return request("/auth/login", {
            method: "POST",
            body: payload
        });
    },
    signup(payload) {
        return request("/auth/signup", {
            method: "POST",
            body: payload
        });
    },
    logout(payload) {
        return request("/auth/logout", {
            method: "POST",
            body: payload
        });
    },
    resetPassword(email) {
        return request("/auth/reset-password", {
            method: "POST",
            body: { email }
        });
    },
    getClientContext(accessToken) {
        return request("/client-context", {
            accessToken
        });
    },
    getProjects(accessToken, organizationId) {
        return request(`/projects?organizationId=${encodeURIComponent(organizationId)}`, {
            accessToken
        });
    },
    getProject(accessToken, projectId) {
        return request(`/projects/${projectId}`, {
            accessToken
        });
    },
    createProject(accessToken, payload) {
        return request("/projects", {
            accessToken,
            method: "POST",
            body: payload
        });
    },
    createBrief(accessToken, projectId, payload) {
        return request(`/projects/${projectId}/briefs`, {
            accessToken,
            method: "POST",
            body: payload
        });
    },
    createJob(accessToken, projectId, payload) {
        return request(`/projects/${projectId}/jobs`, {
            accessToken,
            method: "POST",
            body: payload
        });
    },
    getJob(accessToken, jobId) {
        return request(`/jobs/${jobId}`, {
            accessToken
        });
    },
    retryJob(accessToken, jobId) {
        return request(`/jobs/${jobId}/retry`, {
            accessToken,
            method: "POST"
        });
    },
    getProjectDeliverables(accessToken, projectId) {
        return request(`/projects/${projectId}/deliverables`, {
            accessToken
        });
    },
    createBrand(accessToken, payload) {
        return request("/brands", {
            accessToken,
            method: "POST",
            body: payload
        });
    },
    updateBrand(accessToken, brandId, payload) {
        return request(`/brands/${brandId}`, {
            accessToken,
            method: "PATCH",
            body: payload
        });
    }
};
