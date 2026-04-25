"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "password" | "magic";

export default function ConnexionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, signIn, sendMagicLink } = useAuth();

  const [mode, setMode] = useState<Mode>("password");
  const [pending, setPending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const [form, setForm] = useState({ email: "", password: "" });

  /* Rediriger si déjà connecté */
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/tableau-de-bord");
    }
  }, [isAuthenticated, isLoading, router]);

  /* Connexion par email + mot de passe */
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    try {
      await signIn({ email: form.email, password: form.password });
      router.replace("/tableau-de-bord");
    } catch (error) {
      toast({
        title: "Connexion impossible",
        description:
          error instanceof Error ? error.message : "Vérifiez vos identifiants et réessayez.",
        variant: "destructive"
      });
    } finally {
      setPending(false);
    }
  }

  /* Connexion par magic link */
  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    try {
      await sendMagicLink(form.email);
      setMagicSent(true);
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
          <p className="mt-2 text-sm text-muted-foreground">
            Espace membre — Amicale des Ivoiriens de Montpellier et Hérault
          </p>
        </div>

        <Card>
          <CardHeader>
            {/* Onglets de mode */}
            <div className="mb-2 flex rounded-lg border border-border bg-muted p-1">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  mode === "password"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => { setMode("password"); setMagicSent(false); }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Lock className="size-3.5" /> Mot de passe
                </span>
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  mode === "magic"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => { setMode("magic"); setMagicSent(false); }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="size-3.5" /> Magic link
                </span>
              </button>
            </div>
            <CardTitle className="font-display text-2xl">
              {mode === "password" ? "Connexion" : "Connexion sans mot de passe"}
            </CardTitle>
            <CardDescription>
              {mode === "password"
                ? "Connectez-vous avec votre email et votre mot de passe."
                : "Recevez un lien magique par email pour vous connecter instantanément."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mode === "password" ? (
              /* ── Formulaire email + MDP ── */
              <form className="space-y-4" onSubmit={handleLogin}>
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
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      <Lock className="mr-1 inline size-3.5" />
                      Mot de passe
                    </Label>
                    <Link
                      href="/reinitialiser"
                      className="text-xs text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending || isLoading}>
                  {pending ? "Connexion…" : "Se connecter"}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            ) : (
              /* ── Magic link ── */
              <>
                {magicSent ? (
                  <div className="space-y-4 py-4 text-center">
                    <div className="flex justify-center">
                      <span className="flex size-14 items-center justify-center rounded-full bg-accent">
                        <Mail className="size-7 text-primary" />
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Email envoyé !</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        Un lien de connexion a été envoyé à <strong>{form.email}</strong>.
                        Vérifiez votre boîte de réception (et vos spams).
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setMagicSent(false)}
                    >
                      Renvoyer un lien
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleMagicLink}>
                    <div className="space-y-1.5">
                      <Label htmlFor="magic-email">
                        <Mail className="mr-1 inline size-3.5" />
                        Email
                      </Label>
                      <Input
                        id="magic-email"
                        type="email"
                        required
                        placeholder="vous@email.fr"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={pending}>
                      {pending ? "Envoi…" : "Recevoir mon lien magique"}
                      <Zap className="size-4" />
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* Lien inscription */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore membre ?{" "}
              <Link href="/inscription" className="font-medium text-primary hover:underline">
                Rejoindre l'AIMH
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
