"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function slugify(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
export default function AuthPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { isAuthenticated, isLoading, signIn, signUp, resetPassword } = useAuth();
    const [mode, setMode] = useState("login");
    const [pending, setPending] = useState(false);
    const [loginForm, setLoginForm] = useState({
        email: "",
        password: ""
    });
    const [signupForm, setSignupForm] = useState({
        fullName: "",
        organizationName: "",
        organizationSlug: "",
        email: "",
        password: ""
    });
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);
    const disabled = pending || isLoading;
    const authHighlights = useMemo(() => [
        "Briefs adaptés par type d’agent",
        "Suivi des jobs en temps réel",
        "Livrables et références centralisés"
    ], []);
    async function handleLogin(event) {
        event.preventDefault();
        setPending(true);
        try {
            await signIn(loginForm);
            router.replace("/dashboard");
        }
        catch (error) {
            toast({
                title: "Connexion impossible",
                description: error instanceof Error ? error.message : "Vérifiez vos identifiants.",
                variant: "destructive"
            });
        }
        finally {
            setPending(false);
        }
    }
    async function handleSignup(event) {
        event.preventDefault();
        setPending(true);
        try {
            await signUp(signupForm);
            router.replace("/dashboard");
        }
        catch (error) {
            toast({
                title: "Création de compte impossible",
                description: error instanceof Error ? error.message : "Réessayez avec un autre slug.",
                variant: "destructive"
            });
        }
        finally {
            setPending(false);
        }
    }
    async function handleResetPassword() {
        if (!loginForm.email) {
            toast({
                title: "Email requis",
                description: "Renseignez votre email avant de demander la réinitialisation.",
                variant: "destructive"
            });
            return;
        }
        setPending(true);
        try {
            await resetPassword(loginForm.email);
            toast({
                title: "Email envoyé",
                description: "Un lien de réinitialisation vient d’être envoyé."
            });
        }
        catch (error) {
            toast({
                title: "Réinitialisation impossible",
                description: error instanceof Error ? error.message : "Réessayez dans un instant.",
                variant: "destructive"
            });
        }
        finally {
            setPending(false);
        }
    }
    return (<main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface mesh-panel flex flex-col justify-between rounded-[2rem] border px-7 py-8 sm:px-10 sm:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-primary">
              <Sparkles className="size-4"/>
              Espace client premium
            </div>
            <h1 className="mt-8 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
              Pilotez vos <span className="text-gradient">agents marketing</span> dans un cockpit pensé pour la
              vitesse.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Un univers sombre, éditorial et orienté exécution pour lancer des briefs, suivre les jobs et récupérer
              vos livrables sans friction.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {authHighlights.map((highlight) => (<div key={highlight} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-accent"/>
                <p className="text-sm leading-6 text-foreground">{highlight}</p>
              </div>))}
          </div>
        </section>

        <Card className="surface h-full border-white/10">
          <CardHeader className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
              <button type="button" className={`rounded-full px-4 py-2 text-sm transition ${mode === "login" ? "bg-white text-background" : "text-muted-foreground"}`} onClick={() => setMode("login")}>
                Connexion
              </button>
              <button type="button" className={`rounded-full px-4 py-2 text-sm transition ${mode === "signup" ? "bg-white text-background" : "text-muted-foreground"}`} onClick={() => setMode("signup")}>
                Inscription
              </button>
            </div>
            <div>
              <CardTitle className="font-display text-3xl">
                {mode === "login" ? "Bienvenue à bord" : "Créer votre espace client"}
              </CardTitle>
              <CardDescription className="mt-2 text-base leading-7 text-muted-foreground">
                {mode === "login"
            ? "Connectez-vous avec Supabase Auth pour retrouver vos projets, briefs et livrables."
            : "Créez votre compte, votre organisation et démarrez votre premier projet dès maintenant."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (<form className="space-y-5" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="nom@marque.fr" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}/>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1" disabled={disabled} type="submit">
                    Se connecter
                    <ArrowRight className="size-4"/>
                  </Button>
                  <Button className="flex-1" disabled={disabled} type="button" variant="secondary" onClick={handleResetPassword}>
                    <KeyRound className="size-4"/>
                    Réinitialiser le mot de passe
                  </Button>
                </div>
              </form>) : (<form className="space-y-5" onSubmit={handleSignup}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input id="signup-name" placeholder="Camille Martin" value={signupForm.fullName} onChange={(event) => setSignupForm((current) => ({ ...current, fullName: event.target.value }))}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="camille@marque.fr" value={signupForm.email} onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}/>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organization-name">Nom de l’organisation</Label>
                    <Input id="organization-name" placeholder="Maison Atlas" value={signupForm.organizationName} onChange={(event) => setSignupForm((current) => ({
                ...current,
                organizationName: event.target.value,
                organizationSlug: current.organizationSlug || slugify(event.target.value)
            }))}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization-slug">Slug de l’organisation</Label>
                    <Input id="organization-slug" placeholder="maison-atlas" value={signupForm.organizationSlug} onChange={(event) => setSignupForm((current) => ({ ...current, organizationSlug: slugify(event.target.value) }))}/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input id="signup-password" type="password" placeholder="Au moins 8 caractères" value={signupForm.password} onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}/>
                </div>
                <Button className="w-full" disabled={disabled} type="submit">
                  Créer mon compte
                  <ArrowRight className="size-4"/>
                </Button>
              </form>)}
          </CardContent>
        </Card>
      </div>
    </main>);
}
