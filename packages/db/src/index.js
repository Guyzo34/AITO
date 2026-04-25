import { PrismaClient } from "../generated/client/index.js";
export const prisma = globalThis.__agentsMarketingPrisma__ ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
    });
if (process.env.NODE_ENV !== "production") {
    globalThis.__agentsMarketingPrisma__ = prisma;
}
export * from "../generated/client/index.js";
