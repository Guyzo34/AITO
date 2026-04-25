import { PrismaClient } from "../generated/client/index.js";

declare global {
  var __agentsMarketingPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__agentsMarketingPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__agentsMarketingPrisma__ = prisma;
}

export * from "../generated/client/index.js";