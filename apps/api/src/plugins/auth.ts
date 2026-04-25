import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../lib/supabase.js";

async function verifyRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Jeton d'authentification manquant." });
    return;
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    await reply.code(401).send({ error: "Jeton d'authentification invalide." });
    return;
  }

  request.authUser = data.user;
}

// Ce plugin expose un middleware simple pour protéger les routes métier.
export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest("authUser", null as unknown as User);
  fastify.decorate("authenticate", verifyRequest);
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}