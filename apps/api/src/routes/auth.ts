import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@agents-marketing/db";
import { supabaseAdmin, supabaseAuth } from "../lib/supabase.js";

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1).max(120),
  organizationName: z.string().trim().min(1).max(120),
  organizationSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/)
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

const logoutSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1)
});

// Ces routes couvrent le cycle d'auth de base via Supabase.
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/auth/signup", async (request, reply) => {
    const input = signUpSchema.parse(request.body);

    const existingOrganization = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug }
    });

    if (existingOrganization) {
      return reply.code(409).send({ error: "Ce slug d'organisation existe déjà." });
    }

    const signUpResult = await supabaseAuth.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName
        }
      }
    });

    if (signUpResult.error || !signUpResult.data.user) {
      return reply.code(400).send({
        error: signUpResult.error?.message ?? "Impossible de créer le compte."
      });
    }

    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        fullName: input.fullName,
        lastLoginAt: new Date()
      },
      create: {
        id: signUpResult.data.user.id,
        email: input.email,
        fullName: input.fullName,
        lastLoginAt: new Date()
      }
    });

    const organization = await prisma.organization.create({
      data: {
        name: input.organizationName,
        slug: input.organizationSlug,
        members: {
          create: {
            userId: user.id,
            role: "owner"
          }
        }
      }
    });

    return reply.code(201).send({
      user,
      organization,
      session: signUpResult.data.session
    });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const result = await supabaseAuth.auth.signInWithPassword({
      email: input.email,
      password: input.password
    });

    if (result.error || !result.data.user || !result.data.session) {
      return reply.code(401).send({
        error: result.error?.message ?? "Identifiants invalides."
      });
    }

    await prisma.user.upsert({
      where: { email: input.email },
      update: {
        id: result.data.user.id,
        email: result.data.user.email ?? input.email,
        fullName: (result.data.user.user_metadata.full_name as string | undefined) ?? null,
        lastLoginAt: new Date()
      },
      create: {
        id: result.data.user.id,
        email: result.data.user.email ?? input.email,
        fullName: (result.data.user.user_metadata.full_name as string | undefined) ?? null,
        lastLoginAt: new Date()
      }
    });

    return reply.send({
      user: result.data.user,
      session: result.data.session
    });
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const input = logoutSchema.parse(request.body);

    const { error: setSessionError } = await supabaseAuth.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken
    });

    if (setSessionError) {
      return reply.code(400).send({ error: setSessionError.message });
    }

    const currentUserResult = await supabaseAdmin.auth.getUser(input.accessToken);

    const { error: logoutError } = await supabaseAuth.auth.signOut();

    if (logoutError) {
      return reply.code(400).send({ error: logoutError.message });
    }

    if (currentUserResult.data.user) {
      await prisma.user.updateMany({
        where: { id: currentUserResult.data.user.id },
        data: { lastLoginAt: new Date() }
      });
    }

    return reply.send({ success: true });
  });

  fastify.post("/auth/reset-password", async (request, reply) => {
    const input = z.object({ email: z.email() }).parse(request.body);

    const result = await supabaseAuth.auth.resetPasswordForEmail(input.email);

    if (result.error) {
      return reply.code(400).send({ error: result.error.message });
    }

    return reply.send({ success: true });
  });
};