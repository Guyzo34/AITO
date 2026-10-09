"use client";

import { useEffect, useState } from "react";
import { Save, User, Mail, Phone, MapPin, FileText } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profil = {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  bio: string;
};

/* Page profil : voir et modifier les informations du membre */
export default function ProfilPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profil, setProfil] = useState<Profil>({
    nom:       (user?.user_metadata?.nom       as string | undefined) ?? "",
    prenom:    (user?.user_metadata?.prenom    as string | undefined) ?? "",
    telephone: "",
    ville:     "",
    bio:       ""
  });

  const [pending, setPending] = useState(false);
  const [loadingProfil, setLoadingProfil] = useState(true);

  /* Charger le profil depuis Supabase */
  useEffect(() => {
    async function chargerProfil() {
      if (!user?.id) {
        setLoadingProfil(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("nom, prenom, telephone, ville, bio")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfil({
          nom:       data.nom       ?? "",
          prenom:    data.prenom    ?? "",
          telephone: data.telephone ?? "",
          ville:     data.ville     ?? "",
          bio:       data.bio       ?? ""
        });
      }

      setLoadingProfil(false);
    }

    void chargerProfil();
  }, [user?.id]);

  function update(field: keyof Profil) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setProfil((p) => ({ ...p, [field]: e.target.value }));
  }

  /* Sauvegarder les modifications */
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.id) return;
    setPending(true);

    try {
      /* Upsert dans la table profiles */
      const { error } = await supabase.from("profiles").upsert({
        id:        user.id,
        email:     user.email,
        nom:       profil.nom,
        prenom:    profil.prenom,
        telephone: profil.telephone || null,
        ville:     profil.ville     || null,
        bio:       profil.bio       || null,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      /* Mettre à jour les métadonnées Supabase Auth */
      await supabase.auth.updateUser({
        data: {
          nom:       profil.nom,
          prenom:    profil.prenom,
          full_name: `${profil.prenom} ${profil.nom}`
        }
      });

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description:
          error instanceof Error ? error.message : "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    } finally {
      setPending(false);
    }
  }

  /* Initiales */
  const initials = `${profil.prenom.charAt(0)}${profil.nom.charAt(0)}`.toUpperCase() || "M";

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Mon profil</h1>
        <p className="mt-1 text-muted-foreground">Gérez vos informations personnelles</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Carte avatar */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold font-display">
              {initials}
            </span>
            <div>
              <p className="font-semibold text-foreground">
                {profil.prenom} {profil.nom}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Membre actif
            </span>
            {user?.email_confirmed_at && (
              <span className="text-xs text-muted-foreground">
                Email vérifié ✓
              </span>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de modification */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Modifier mes informations</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProfil ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom">
                      <User className="mr-1 inline size-3.5" />
                      Prénom
                    </Label>
                    <Input
                      id="prenom"
                      placeholder="Votre prénom"
                      value={profil.prenom}
                      onChange={update("prenom")}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      placeholder="Votre nom"
                      value={profil.nom}
                      onChange={update("nom")}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <Mail className="mr-1 inline size-3.5" />
                    Email
                  </Label>
                  <Input
                    value={user?.email ?? ""}
                    readOnly
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'adresse email ne peut pas être modifiée ici.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone">
                      <Phone className="mr-1 inline size-3.5" />
                      Téléphone
                    </Label>
                    <Input
                      id="telephone"
                      type="tel"
                      placeholder="+33 6 00 00 00 00"
                      value={profil.telephone}
                      onChange={update("telephone")}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ville">
                      <MapPin className="mr-1 inline size-3.5" />
                      Ville
                    </Label>
                    <Input
                      id="ville"
                      placeholder="Toulouse"
                      value={profil.ville}
                      onChange={update("ville")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">
                    <FileText className="mr-1 inline size-3.5" />
                    À propos de moi
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Quelques mots sur vous, votre région d'origine, vos centres d'intérêt…"
                    value={profil.bio}
                    onChange={update("bio")}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Sauvegarde…" : "Enregistrer les modifications"}
                  <Save className="size-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
