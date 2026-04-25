import fp from "fastify-plugin";
import { supabaseAdmin } from "../lib/supabase.js";
async function verifyRequest(request, reply) {
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
    fastify.decorateRequest("authUser", null);
    fastify.decorate("authenticate", verifyRequest);
});
