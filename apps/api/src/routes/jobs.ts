import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@agents-marketing/db";
import { jobStatusSchema } from "@agents-marketing/types";
import { z } from "zod";
import { getBoss } from "../lib/boss.js";
import { apiEnv } from "../env.js";

const jobCreateSchema = z.object({
  briefId: z.string().uuid().optional(),
  jobType: z.string().trim().min(1).max(120),
  priority: z.number().int().min(0).max(100).default(0)
});

const jobUpdateSchema = z.object({
  status: jobStatusSchema.optional(),
  errorMessage: z.string().trim().min(1).nullable().optional()
});

// Ces routes pilotent la création et le suivi des jobs async.
export const jobRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/projects/:id/jobs", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = jobCreateSchema.parse(request.body);

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        organization: {
          members: {
            some: {
              userId: request.authUser.id
            }
          }
        }
      }
    });

    if (!project) {
      return reply.code(404).send({ error: "Projet introuvable." });
    }

    if (input.briefId) {
      const brief = await prisma.brief.findFirst({
        where: {
          id: input.briefId,
          projectId: project.id
        }
      });

      if (!brief) {
        return reply.code(400).send({ error: "Le brief fourni n'appartient pas au projet." });
      }
    }

    const job = await prisma.job.create({
      data: {
        projectId: project.id,
        jobType: input.jobType,
        priority: input.priority,
        status: "queued",
        ...(input.briefId ? { briefId: input.briefId } : {})
      }
    });

    const boss = await getBoss();

    await boss.send(apiEnv.PG_BOSS_JOB_NAME, {
      jobId: job.id,
      agentType: project.agentType
    });

    return reply.code(201).send(job);
  });

  fastify.get("/jobs/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        project: {
          organization: {
            members: {
              some: {
                userId: request.authUser.id
              }
            }
          }
        }
      },
      include: {
        jobSteps: {
          orderBy: { stepOrder: "asc" }
        },
        agentRuns: true,
        assets: {
          orderBy: {
            createdAt: "desc"
          }
        },
        deliveries: true,
        qaReports: true
      }
    });

    if (!job) {
      return reply.code(404).send({ error: "Job introuvable." });
    }

    return job;
  });

  fastify.get("/jobs/:id/steps", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        project: {
          organization: {
            members: {
              some: {
                userId: request.authUser.id
              }
            }
          }
        }
      },
      select: { id: true }
    });

    if (!job) {
      return reply.code(404).send({ error: "Job introuvable." });
    }

    return prisma.jobStep.findMany({
      where: { jobId: params.id },
      orderBy: { stepOrder: "asc" }
    });
  });

  fastify.patch("/jobs/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = jobUpdateSchema.parse(request.body);

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        project: {
          organization: {
            members: {
              some: {
                userId: request.authUser.id
              }
            }
          }
        }
      }
    });

    if (!job) {
      return reply.code(404).send({ error: "Job introuvable." });
    }

    const updateData = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "errorMessage")
        ? { errorMessage: input.errorMessage ?? null }
        : {})
    };

    return prisma.job.update({
      where: { id: params.id },
      data: updateData
    });
  });

  fastify.post("/jobs/:id/retry", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        project: {
          organization: {
            members: {
              some: {
                userId: request.authUser.id
              }
            }
          }
        }
      },
      include: {
        project: true
      }
    });

    if (!job) {
      return reply.code(404).send({ error: "Job introuvable." });
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        status: "queued",
        queuedAt: new Date(),
        startedAt: null,
        finishedAt: null,
        errorMessage: null
      }
    });

    const boss = await getBoss();

    await boss.send(apiEnv.PG_BOSS_JOB_NAME, {
      jobId: updatedJob.id,
      agentType: job.project.agentType
    });

    return reply.send(updatedJob);
  });
};