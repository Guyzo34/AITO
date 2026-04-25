import { createClient } from "@supabase/supabase-js";
import { apiEnv } from "../env.js";

// Ce client service est utilisé pour vérifier les jetons côté serveur.
export const supabaseAdmin = createClient(
  apiEnv.SUPABASE_URL,
  apiEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Ce client public pilote les opérations d'auth classiques.
export const supabaseAuth = createClient(
  apiEnv.SUPABASE_URL,
  apiEnv.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);