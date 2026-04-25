const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!apiUrl || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Variables NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SUPABASE_* manquantes.");
}
export const env = {
    apiUrl,
    supabaseUrl,
    supabaseAnonKey
};
