import type { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@agents-marketing/db";
import { briefStatusSchema } from "@agents-marketing/types";
import { z } from "zod";

const briefCreateSchema = z.object({
  rawInputText: z.string().trim().min(1),
  attachmentsJson: z.unknown().optional(),
  parsedBriefJson: z.unknown().optional(),
  status: briefStatusSchema.optional()
});

const briefUpdateSchema = z.object({
  rawInputText: z.string().trim().min(1).optional(),
  attachmentsJson: z.unknown().nullable().optional(),
  parsedBriefJson: z.unknown().nullable().optional(),
  status: briefStatusSchema.optional()
});

function toNullableJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

// Ces routes gèrent le cycle de vie initial des briefs.
export const briefRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/projects/:id/briefs", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = briefCreateSchema.parse(request.body);

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

    const brief = await prisma.brief.create({
      data: {
        projectId: project.id,
        rawInputText: input.rawInputText,
        status: input.status ?? "submitted",
        ...(input.attachmentsJson !== undefined
          ? { attachmentsJson: toNullableJsonValue(input.attachmentsJson) }
          : {}),
        ...(input.parsedBriefJson !== undefined
          ? { parsedBriefJson: toNullableJsonValue(input.parsedBriefJson) }
          : {})
      }
    });

    return reply.code(201).send(brief);
  });

  fastify.get("/projects/:id/briefs", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

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

    return prisma.brief.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" }
    });
  });

  fastify.get("/briefs/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const brief = await prisma.brief.findFirst({
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

    if (!brief) {
      return reply.code(404).send({ error: "Brief introuvable." });
    }

    return brief;
  });

  fastify.patch("/briefs/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = briefUpdateSchema.parse(request.body);

    const brief = await prisma.brief.findFirst({
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

    if (!brief) {
      return reply.code(404).send({ error: "Brief introuvable." });
    }

    const updateData = {
      ...(input.rawInputText !== undefined ? { rawInputText: input.rawInputText } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "attachmentsJson")
        ? { attachmentsJson: toNullableJsonValue(input.attachmentsJson ?? null) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "parsedBriefJson")
        ? { parsedBriefJson: toNullableJsonValue(input.parsedBriefJson ?? null) }
        : {})
    };

    return prisma.brief.update({
      where: { id: params.id },
      data: updateData
    });
  });
};