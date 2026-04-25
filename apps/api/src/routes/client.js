import { Prisma, prisma } from "@agents-marketing/db";
import { z } from "zod";
const brandPayloadSchema = z.object({
    organizationId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    websiteUrl: z.url().nullable().optional(),
    industry: z.string().trim().min(1).max(120).nullable().optional(),
    targetAudience: z.string().trim().min(1).max(400).nullable().optional(),
    toneOfVoice: z.string().trim().min(1).max(400).nullable().optional(),
    brandGuidelinesJson: z.unknown().nullable().optional()
});
const brandUpdateSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    websiteUrl: z.url().nullable().optional(),
    industry: z.string().trim().min(1).max(120).nullable().optional(),
    targetAudience: z.string().trim().min(1).max(400).nullable().optional(),
    toneOfVoice: z.string().trim().min(1).max(400).nullable().optional(),
    brandGuidelinesJson: z.unknown().nullable().optional()
});
function toNullableJsonValue(value) {
    if (value === null) {
        return Prisma.JsonNull;
    }
    return value;
}
export const clientRoutes = async (fastify) => {
    fastify.get("/client-context", { preHandler: fastify.authenticate }, async (request) => {
        const memberships = await prisma.organizationMember.findMany({
            where: {
                userId: request.authUser.id
            },
            include: {
                organization: {
                    include: {
                        brands: {
                            orderBy: {
                                createdAt: "desc"
                            }
                        }
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });
        const organizations = memberships.map((membership) => ({
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            plan: membership.organization.plan,
            role: membership.role
        }));
        const brands = memberships.flatMap((membership) => membership.organization.brands.map((brand) => ({
            ...brand,
            organization: {
                id: membership.organization.id,
                name: membership.organization.name,
                slug: membership.organization.slug
            }
        })));
        return {
            organizations,
            currentOrganizationId: organizations[0]?.id ?? null,
            brands
        };
    });
    fastify.get("/brands", { preHandler: fastify.authenticate }, async (request, reply) => {
        const query = z
            .object({
            organizationId: z.string().uuid().optional()
        })
            .parse(request.query);
        const fallbackMembership = query.organizationId
            ? null
            : await prisma.organizationMember.findFirst({
                where: {
                    userId: request.authUser.id
                },
                orderBy: {
                    id: "asc"
                }
            });
        const organizationId = query.organizationId ?? fallbackMembership?.organizationId;
        if (!organizationId) {
            return reply.code(404).send({ error: "Aucune organisation disponible." });
        }
        const membership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId: request.authUser.id
            }
        });
        if (!membership) {
            return reply.code(403).send({ error: "Accès refusé à cette organisation." });
        }
        return prisma.brand.findMany({
            where: {
                organizationId
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    });
    fastify.post("/brands", { preHandler: fastify.authenticate }, async (request, reply) => {
        const input = brandPayloadSchema.parse(request.body);
        const membership = await prisma.organizationMember.findFirst({
            where: {
                organizationId: input.organizationId,
                userId: request.authUser.id
            }
        });
        if (!membership) {
            return reply.code(403).send({ error: "Accès refusé à cette organisation." });
        }
        const brand = await prisma.brand.create({
            data: {
                organizationId: input.organizationId,
                name: input.name,
                websiteUrl: input.websiteUrl ?? null,
                industry: input.industry ?? null,
                targetAudience: input.targetAudience ?? null,
                toneOfVoice: input.toneOfVoice ?? null,
                ...(Object.prototype.hasOwnProperty.call(input, "brandGuidelinesJson")
                    ? { brandGuidelinesJson: toNullableJsonValue(input.brandGuidelinesJson ?? null) }
                    : {})
            }
        });
        return reply.code(201).send(brand);
    });
    fastify.patch("/brands/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const input = brandUpdateSchema.parse(request.body);
        const brand = await prisma.brand.findFirst({
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
        if (!brand) {
            return reply.code(404).send({ error: "Marque introuvable." });
        }
        return prisma.brand.update({
            where: {
                id: params.id
            },
            data: {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(Object.prototype.hasOwnProperty.call(input, "websiteUrl")
                    ? { websiteUrl: input.websiteUrl ?? null }
                    : {}),
                ...(Object.prototype.hasOwnProperty.call(input, "industry")
                    ? { industry: input.industry ?? null }
                    : {}),
                ...(Object.prototype.hasOwnProperty.call(input, "targetAudience")
                    ? { targetAudience: input.targetAudience ?? null }
                    : {}),
                ...(Object.prototype.hasOwnProperty.call(input, "toneOfVoice")
                    ? { toneOfVoice: input.toneOfVoice ?? null }
                    : {}),
                ...(Object.prototype.hasOwnProperty.call(input, "brandGuidelinesJson")
                    ? { brandGuidelinesJson: toNullableJsonValue(input.brandGuidelinesJson ?? null) }
                    : {})
            }
        });
    });
};
