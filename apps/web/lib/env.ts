/* Suppression de la dépendance à NEXT_PUBLIC_API_URL pour la Phase 1 AITO */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables d'environnement manquantes : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises."
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey
} as const;
