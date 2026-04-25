import PgBoss from "pg-boss";
import { baseEnvSchema, parseEnv } from "@agents-marketing/config";
import { runWorkflow } from "@agents-marketing/workflows";
import { workflowJobPayloadSchema } from "@agents-marketing/types";
import { z } from "zod";
const workerEnvSchema = baseEnvSchema.extend({
    DATABASE_URL: z.string().min(1)
});
async function startWorker() {
    const env = parseEnv(workerEnvSchema);
    const boss = new PgBoss({
        connectionString: env.DATABASE_URL,
        schema: env.PG_BOSS_SCHEMA
    });
    await boss.start();
    await boss.work(env.PG_BOSS_JOB_NAME, async (payload) => {
        const parsedPayload = workflowJobPayloadSchema.parse(payload);
        try {
            await runWorkflow(parsedPayload);
        }
        catch (error) {
            console.error(`Le job ${parsedPayload.jobId} a échoué dans le worker.`, error);
            throw error;
        }
    });
    console.info("Worker pg-boss démarré");
}
void startWorker().catch((error) => {
    console.error("Impossible de démarrer le worker", error);
    process.exit(1);
});
