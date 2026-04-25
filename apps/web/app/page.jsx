"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
export default function Home() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();
    useEffect(() => {
        if (isLoading) {
            return;
        }
        router.replace(isAuthenticated ? "/dashboard" : "/connexion");
    }, [isAuthenticated, isLoading, router]);
    return (<main className="flex min-h-screen items-center justify-center px-6">
      <div className="surface mesh-panel w-full max-w-2xl rounded-[2rem] border px-8 py-14 text-center">
        <p className="font-display text-sm uppercase tracking-[0.45em] text-primary">Agents Marketing</p>
        <h1 className="mt-6 font-display text-4xl text-gradient sm:text-6xl">Studio client orchestré</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Ouverture de l’espace client, synchronisation de la session Supabase et chargement du cockpit.
        </p>
      </div>
    </main>);
}
