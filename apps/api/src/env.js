import { baseEnvSchema, parseEnv } from "@agents-marketing/config";
// Ce module centralise la validation d'environnement côté API.
export const apiEnv = parseEnv(baseEnvSchema);
