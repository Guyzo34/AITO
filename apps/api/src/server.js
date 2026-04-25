import { apiEnv } from "./env.js";
import { buildApp } from "./app.js";
async function startServer() {
    const app = await buildApp();
    await app.listen({
        host: "0.0.0.0",
        port: apiEnv.API_PORT
    });
}
// Le démarrage est explicite pour échouer vite si la configuration est invalide.
void startServer().catch((error) => {
    console.error("Impossible de démarrer l'API", error);
    process.exit(1);
});
