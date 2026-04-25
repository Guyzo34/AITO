import { z } from "zod";
export declare const baseEnvSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    DIRECT_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodURL;
    SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodString;
    APP_URL: z.ZodString;
    API_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    WEB_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    WORKER_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    PG_BOSS_SCHEMA: z.ZodDefault<z.ZodString>;
    PG_BOSS_JOB_NAME: z.ZodDefault<z.ZodString>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    FAL_KEY: z.ZodOptional<z.ZodString>;
    ELEVENLABS_API_KEY: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export declare function parseEnv<TSchema extends z.ZodTypeAny>(schema: TSchema, values?: Record<string, string | undefined>): z.infer<TSchema>;
//# sourceMappingURL=index.d.ts.map