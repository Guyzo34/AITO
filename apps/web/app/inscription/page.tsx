"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, signUp } = useAuth();

  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
    passwordConfirm: ""
  });

  /* Rediriger si déjà connecté */
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/tableau-de-bord");
    }
  }, [isAuthenticated, isLoading, router]);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (form.password !== form.passwordConfirm) {
      toast({
        title: "Mots de passe différents",
        description: "Les deux mots de passe saisis ne correspondent pas.",
        variant: "destructive"
      });
      return;
    }

    if (form.password.length < 8) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        variant: "destructive"
      });
      return;
    }

    setPending(true);

    try {
      await signUp({
        email: form.email,
        password: form.password,
        nom: form.nom,
        prenom: form.prenom
      });
      setDone(true);
    } catch (error) {
      toast({
        title: "Inscription impossible",
        description:
          error instanceof Error ? error.message : "Une erreur est survenue. Réessayez.",
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
            Créer votre compte membre
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Rejoindre l'AIMH</CardTitle>
            <CardDescription>
              Créez votre compte pour accéder à l'espace membre et aux activités de l'association.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              /* ── Confirmation ── */
              <div className="space-y-4 py-4 text-center">
                <div className="flex justify-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="size-7 text-green-600" />
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Compte créé !</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Un email de confirmation a été envoyé à <strong>{form.email}</strong>.
                    Cliquez sur le lien reçu pour activer votre compte.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/connexion">Se connecter</Link>
                </Button>
              </div>
            ) : (
              /* ── Formulaire d'inscription ── */
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom">
                      <User className="mr-1 inline size-3.5" />
                      Prénom *
                    </Label>
                    <Input
                      id="prenom"
                      required
                      placeholder="Votre prénom"
                      value={form.prenom}
                      onChange={update("prenom")}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      required
                      placeholder="Votre nom"
                      value={form.nom}
                      onChange={update("nom")}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    <Mail className="mr-1 inline size-3.5" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="vous@email.fr"
                    value={form.email}
                    onChange={update("email")}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    <Lock className="mr-1 inline size-3.5" />
                    Mot de passe * <span className="text-xs font-normal text-muted-foreground">(8 caractères min.)</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={update("password")}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passwordConfirm">Confirmer le mot de passe *</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.passwordConfirm}
                    onChange={update("passwordConfirm")}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={pending || isLoading}>
                  {pending ? "Création du compte…" : "Créer mon compte"}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà membre ?{" "}
              <Link href="/connexion" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
