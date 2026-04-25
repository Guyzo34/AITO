import { z } from "zod";
export const baseEnvSchema = z.object({
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    APP_URL: z.string().url(),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_PORT: z.coerce.number().int().positive().default(3000),
    WORKER_PORT: z.coerce.number().int().positive().default(4100),
    PG_BOSS_SCHEMA: z.string().min(1).default("pgboss"),
    PG_BOSS_JOB_NAME: z.string().min(1).default("project-job"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    FAL_KEY: z.string().min(1).optional(),
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(1).optional()
});
export function parseEnv(schema, values = process.env) {
    return schema.parse(values);
}
