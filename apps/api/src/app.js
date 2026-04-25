import cors from "@fastify/cors";
import Fastify from "fastify";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { clientRoutes } from "./routes/client.js";
import { projectRoutes } from "./routes/projects.js";
import { briefRoutes } from "./routes/briefs.js";
import { jobRoutes } from "./routes/jobs.js";
// Cette fabrique assemble l'API Fastify et ses routes métier.
export async function buildApp() {
    const app = Fastify({
        logger: true
    });
    await app.register(cors, {
        origin: true,
        credentials: true
    });
    await app.register(authPlugin);
    app.get("/health", async () => ({
        status: "ok"
    }));
    app.get("/me", { preHandler: app.authenticate }, async (request) => ({
        user: request.authUser
    }));
    await app.register(authRoutes);
    await app.register(clientRoutes);
    await app.register(projectRoutes);
    await app.register(briefRoutes);
    await app.register(jobRoutes);
    return app;
}
