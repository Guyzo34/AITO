"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/* Contenu du callback — utilise useSearchParams → doit être dans un Suspense */
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as
        | "signup"
        | "magiclink"
        | "recovery"
        | "email_change"
        | null;
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription ?? "Une erreur s'est produite lors de l'authentification.");
        return;
      }

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type
        });

        if (verifyError) {
          setStatus("error");
          setMessage(verifyError.message);
          return;
        }

        setStatus("success");

        if (type === "recovery") {
          setMessage("Identité vérifiée. Redirection vers votre espace…");
        } else {
          setMessage("Email confirmé avec succès ! Vous êtes maintenant connecté.");
        }

        window.setTimeout(() => router.replace("/tableau-de-bord"), 2000);
        return;
      }

      /* Vérifier si une session existe déjà */
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session) {
        setStatus("success");
        setMessage("Connexion réussie. Redirection vers votre espace…");
        window.setTimeout(() => router.replace("/tableau-de-bord"), 1500);
        return;
      }

      setStatus("error");
      setMessage("Lien invalide ou expiré. Veuillez réessayer.");
    }

    void handleCallback();
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-md text-center">
      {/* Logo */}
      <Link href="/" className="mb-8 inline-flex flex-col items-center gap-2">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold font-display">
          A
        </span>
        <span className="font-display text-2xl font-bold text-primary">AITO</span>
      </Link>

      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="mx-auto size-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification en cours…</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle2 className="mx-auto size-12 text-green-500" />
          <p className="font-semibold text-foreground">{message}</p>
          <Button asChild>
            <Link href="/tableau-de-bord">Accéder à mon espace</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="mx-auto size-12 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Erreur d'authentification</p>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/connexion">Retour à la connexion</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Page wrapper avec Suspense requis par Next.js pour useSearchParams */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
