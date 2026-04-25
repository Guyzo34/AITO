"use client";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const emptyDraft = {
    name: "",
    websiteUrl: "",
    industry: "",
    targetAudience: "",
    toneOfVoice: "",
    logoUrl: "",
    primaryColor: "#66F6FF",
    secondaryColor: "#8B5CF6",
    accentColor: "#FF6AB8",
    toneKeywords: ""
};
export default function BrandProfilePage() {
    const { toast } = useToast();
    const { brands, currentOrganization, refreshClientContext, session } = useAuth();
    const [draft, setDraft] = useState(emptyDraft);
    const [isSaving, setIsSaving] = useState(false);
    const currentBrand = useMemo(() => brands[0] ?? null, [brands]);
    useEffect(() => {
        if (!currentBrand) {
            setDraft(emptyDraft);
            return;
        }
        const guidelines = currentBrand.brandGuidelinesJson ?? null;
        setDraft({
            name: currentBrand.name,
            websiteUrl: currentBrand.websiteUrl ?? "",
            industry: currentBrand.industry ?? "",
            targetAudience: currentBrand.targetAudience ?? "",
            toneOfVoice: currentBrand.toneOfVoice ?? "",
            logoUrl: guidelines?.logoUrl ?? "",
            primaryColor: guidelines?.colors?.primary ?? "#66F6FF",
            secondaryColor: guidelines?.colors?.secondary ?? "#8B5CF6",
            accentColor: guidelines?.colors?.accent ?? "#FF6AB8",
            toneKeywords: guidelines?.toneKeywords?.join(", ") ?? ""
        });
    }, [currentBrand]);
    async function handleSave(event) {
        event.preventDefault();
        if (!session?.access_token || !currentOrganization) {
            toast({
                title: "Session indisponible",
                description: "Reconnectez-vous avant de modifier votre marque.",
                variant: "destructive"
            });
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                organizationId: currentOrganization.id,
                name: draft.name,
                websiteUrl: draft.websiteUrl || null,
                industry: draft.industry || null,
                targetAudience: draft.targetAudience || null,
                toneOfVoice: draft.toneOfVoice || null,
                brandGuidelinesJson: {
                    logoUrl: draft.logoUrl || null,
                    colors: {
                        primary: draft.primaryColor,
                        secondary: draft.secondaryColor,
                        accent: draft.accentColor
                    },
                    toneKeywords: draft.toneKeywords
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean)
                }
            };
            if (currentBrand) {
                await apiClient.updateBrand(session.access_token, currentBrand.id, payload);
            }
            else {
                await apiClient.createBrand(session.access_token, payload);
            }
            await refreshClientContext();
            toast({
                title: "Profil marque sauvegardé",
                description: "Les prochains briefs pourront réutiliser cette identité."
            });
        }
        catch (error) {
            toast({
                title: "Sauvegarde impossible",
                description: error instanceof Error ? error.message : "Le profil marque n’a pas pu être sauvegardé.",
                variant: "destructive"
            });
        }
        finally {
            setIsSaving(false);
        }
    }
    return (<div className="space-y-8">
      <section className="surface mesh-panel rounded-[2rem] border p-6 sm:p-8">
        <p className="font-display text-sm uppercase tracking-[0.35em] text-primary">Profil de marque</p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">Cadrez votre identité pour des livrables cohérents.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Cette fiche alimente vos futurs projets avec un cadre clair sur le ton, l’audience et la direction visuelle.
        </p>
      </section>

      <form className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSave}>
        <Card className="surface border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Paramètres de marque</CardTitle>
            <CardDescription>Créez ou mettez à jour votre marque principale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Nom</Label>
                <Input id="brand-name" placeholder="Maison Atlas" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-website">Site web</Label>
                <Input id="brand-website" placeholder="https://www.maisonatlas.fr" value={draft.websiteUrl} onChange={(event) => setDraft((current) => ({ ...current, websiteUrl: event.target.value }))}/>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-industry">Secteur</Label>
                <Input id="brand-industry" placeholder="Mode premium, SaaS B2B, Hospitality..." value={draft.industry} onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-logo">URL du logo</Label>
                <Input id="brand-logo" placeholder="https://..." value={draft.logoUrl} onChange={(event) => setDraft((current) => ({ ...current, logoUrl: event.target.value }))}/>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-audience">Audience cible</Label>
              <Textarea id="brand-audience" rows={4} placeholder="Décrivez les segments, motivations, freins et contexte d’achat." value={draft.targetAudience} onChange={(event) => setDraft((current) => ({ ...current, targetAudience: event.target.value }))}/>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-tone">Ton de marque</Label>
              <Textarea id="brand-tone" rows={4} placeholder="Ex: premium sans être distant, précis, ambitieux, lumineux, direct." value={draft.toneOfVoice} onChange={(event) => setDraft((current) => ({ ...current, toneOfVoice: event.target.value }))}/>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="color-primary">Couleur primaire</Label>
                <Input id="color-primary" type="color" value={draft.primaryColor} onChange={(event) => setDraft((current) => ({ ...current, primaryColor: event.target.value }))}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color-secondary">Couleur secondaire</Label>
                <Input id="color-secondary" type="color" value={draft.secondaryColor} onChange={(event) => setDraft((current) => ({ ...current, secondaryColor: event.target.value }))}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color-accent">Couleur accent</Label>
                <Input id="color-accent" type="color" value={draft.accentColor} onChange={(event) => setDraft((current) => ({ ...current, accentColor: event.target.value }))}/>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone-keywords">Mots-clés de tonalité</Label>
              <Input id="tone-keywords" placeholder="Editorial, premium, énergique, précis" value={draft.toneKeywords} onChange={(event) => setDraft((current) => ({ ...current, toneKeywords: event.target.value }))}/>
            </div>

            <Button className="w-full" disabled={isSaving} type="submit">
              Sauvegarder le profil de marque
            </Button>
          </CardContent>
        </Card>

        <Card className="surface border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Aperçu éditorial</CardTitle>
            <CardDescription>Une carte de lecture rapide de votre identité de marque.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl">{draft.name || "Nom de marque"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{draft.industry || "Secteur à préciser"}</p>
                </div>
                {draft.logoUrl ? (<img alt={draft.name} className="h-12 w-12 rounded-2xl object-cover" src={draft.logoUrl}/>) : (<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 font-display text-lg">
                    {draft.name.slice(0, 1) || "M"}
                  </div>)}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[draft.primaryColor, draft.secondaryColor, draft.accentColor].map((color) => (<div key={color} className="space-y-2">
                    <div className="h-16 rounded-2xl border border-white/10" style={{ backgroundColor: color }}/>
                    <p className="text-xs text-muted-foreground">{color}</p>
                  </div>))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Audience cible</p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {draft.targetAudience || "Ajoutez vos segments prioritaires, besoins et objections."}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Ton à diffuser</p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {draft.toneOfVoice || "Définissez votre ton de marque pour harmoniser les prochains livrables."}
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>);
}
