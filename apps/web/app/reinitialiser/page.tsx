"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReinitialiserPage() {
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (error) {
      toast({
        title: "Envoi impossible",
        description:
          error instanceof Error ? error.message : "Vérifiez votre adresse email.",
        variant: "destructive"
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold font-display">
              A
            </span>
            <span className="font-display text-2xl font-bold text-primary">AIMH</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Réinitialiser le mot de passe</CardTitle>
            <CardDescription>
              Saisissez votre adresse email. Nous vous enverrons un lien pour créer un nouveau mot de passe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 py-4 text-center">
                <div className="flex justify-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="size-7 text-green-600" />
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Email envoyé !</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                    Vérifiez votre boîte de réception (et vos spams).
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/connexion">
                    <ArrowLeft className="size-4" />
                    Retour à la connexion
                  </Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    <Mail className="mr-1 inline size-3.5" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="vous@email.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Envoi…" : "Envoyer le lien de réinitialisation"}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/connexion">
                    <ArrowLeft className="size-4" />
                    Retour à la connexion
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
