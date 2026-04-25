import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@agents-marketing/db";
import { agentTypeSchema, projectStatusSchema } from "@agents-marketing/types";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";

const projectCreateSchema = z.object({
  organizationId: z.string().uuid(),
  brandId: z.string().uuid().optional(),
  agentType: agentTypeSchema,
  title: z.string().trim().min(1).max(200),
  status: projectStatusSchema.optional()
});

const projectUpdateSchema = z.object({
  brandId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: projectStatusSchema.optional()
});

// Ces routes gèrent le CRUD minimal des projets.
export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/projects", { preHandler: fastify.authenticate }, async (request) => {
    const query = z
      .object({
        organizationId: z.string().uuid().optional()
      })
      .parse(request.query);

    const whereClause = {
      organization: {
        members: {
          some: {
            userId: request.authUser.id
          }
        }
      },
      ...(query.organizationId ? { organizationId: query.organizationId } : {})
    };

    return prisma.project.findMany({
      where: whereClause,
      include: {
        brand: true,
        jobs: {
          orderBy: {
            queuedAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  });

  fastify.get("/projects/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
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
      },
      include: {
        brand: true,
        briefs: {
          orderBy: {
            createdAt: "desc"
          }
        },
        jobs: {
          orderBy: {
            queuedAt: "desc"
          }
        },
        assets: {
          orderBy: {
            createdAt: "desc"
          }
        },
        deliveries: {
          orderBy: {
            deliveredAt: "desc"
          }
        }
      }
    });

    if (!project) {
      return reply.code(404).send({ error: "Projet introuvable." });
    }

    return project;
  });

  fastify.get("/projects/:id/deliverables", { preHandler: fastify.authenticate }, async (request, reply) => {
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
      },
      include: {
        assets: {
          orderBy: {
            createdAt: "desc"
          }
        },
        deliveries: {
          orderBy: {
            deliveredAt: "desc"
          }
        }
      }
    });

    if (!project) {
      return reply.code(404).send({ error: "Projet introuvable." });
    }

    const assets = await Promise.all(
      project.assets.map(async (asset) => {
        const signedUrl = await supabaseAdmin.storage
          .from(asset.storageBucket)
          .createSignedUrl(asset.storagePath, 60 * 60)
          .then((result) => result.data?.signedUrl ?? null)
          .catch(() => null);

        return {
          ...asset,
          downloadUrl: signedUrl
        };
      })
    );

    return {
      assets,
      deliveries: project.deliveries
    };
  });

  fastify.post("/projects", { preHandler: fastify.authenticate }, async (request, reply) => {
    const input = projectCreateSchema.parse(request.body);

    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: request.authUser.id
      }
    });

    if (!membership) {
      return reply.code(403).send({ error: "Accès refusé à cette organisation." });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: input.organizationId,
        agentType: input.agentType,
        title: input.title,
        status: input.status ?? "draft",
        createdByUserId: request.authUser.id,
        ...(input.brandId ? { brandId: input.brandId } : {})
      }
    });

    return reply.code(201).send(project);
  });

  fastify.patch("/projects/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = projectUpdateSchema.parse(request.body);

    const existing = await prisma.project.findFirst({
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

    if (!existing) {
      return reply.code(404).send({ error: "Projet introuvable." });
    }

    const updateData = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "brandId")
        ? { brandId: input.brandId ?? null }
        : {})
    };

    return prisma.project.update({
      where: { id: params.id },
      data: updateData
    });
  });

  fastify.delete("/projects/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const existing = await prisma.project.findFirst({
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

    if (!existing) {
      return reply.code(404).send({ error: "Projet introuvable." });
    }

    await prisma.project.delete({
      where: { id: params.id }
    });

    return reply.code(204).send();
  });
};