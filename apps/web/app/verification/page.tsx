import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Page d'attente de vérification email (après inscription) */
export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="mb-8 inline-flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold font-display">
            A
          </span>
          <span className="font-display text-2xl font-bold text-primary">AITO</span>
        </Link>

        {/* Icône */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-accent">
          <Mail className="size-10 text-primary" />
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground">
          Vérifiez votre email
        </h1>
        <p className="mt-4 text-muted-foreground leading-7">
          Nous avons envoyé un lien de confirmation à votre adresse email.
          Cliquez sur ce lien pour activer votre compte AITO.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-left card-shadow">
          <p className="font-medium text-foreground">Vous n'avez pas reçu l'email ?</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Vérifiez votre dossier <strong>spams / courrier indésirable</strong></li>
            <li>• Assurez-vous que l'adresse email est correcte</li>
            <li>• Attendez quelques minutes avant de réessayer</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild>
            <Link href="/connexion">
              Aller à la connexion
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
