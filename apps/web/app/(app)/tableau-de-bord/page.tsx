"use client";

import Link from "next/link";
import { ArrowRight, Users, Calendar, Bell, Heart, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActualitesRecentes, CATEGORIE_COLORS } from "@/lib/data/actualites";

/* Tableau de bord de l'espace membre AITO */
export default function TableauDeBordPage() {
  const { user } = useAuth();

  const prenom = (user?.user_metadata?.prenom as string | undefined) ?? "Membre";
  const nom    = (user?.user_metadata?.nom    as string | undefined) ?? "";
  const email  = user?.email ?? "";

  const actualites = getActualitesRecentes(3);

  /* Initiales pour l'avatar */
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "M";

  return (
    <div className="space-y-8">

      {/* ── Bannière de bienvenue ── */}
      <section className="rounded-xl border border-border bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold font-display">
              {initials}
            </span>
            <div>
              <p className="text-sm opacity-80">Bienvenue dans votre espace membre</p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                Bonjour, {prenom} !
              </h1>
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 bg-white text-primary hover:bg-white/90"
          >
            <Link href="/profil">
              Mon profil
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Infos rapides ── */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Users,
            label: "Statut",
            valeur: "Membre actif",
            couleur: "text-green-600",
            bg: "bg-green-100"
          },
          {
            icon: Calendar,
            label: "Prochaine réunion",
            valeur: "Jeudi 18h",
            couleur: "text-primary",
            bg: "bg-accent"
          },
          {
            icon: Bell,
            label: "Actualités",
            valeur: `${actualites.length} nouvelles`,
            couleur: "text-secondary",
            bg: "bg-green-100"
          }
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.couleur}`}>
                <stat.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold text-foreground">{stat.valeur}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ── Dernières actualités ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">Dernières actualités</h2>
          <Link
            href="/actualites"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Voir tout
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {actualites.map((actu) => {
            const colors = CATEGORIE_COLORS[actu.categorie];
            return (
              <Link key={actu.id} href={`/actualites/${actu.slug}`} className="group block">
                <Card className="transition hover:border-primary/30">
                  <CardContent className="flex items-start gap-4 py-4">
                    <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} shrink-0`}>
                      {actu.categorie}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {actu.titre}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(actu.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-1 group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Actions rapides ── */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Actions rapides</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="size-5 text-primary" />
                Solidarité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-4 text-sm text-muted-foreground">
                Besoin d'aide ou souhaitez-vous aider un membre ? Contactez la commission solidarité.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/contact">Nous contacter</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="size-5 text-primary" />
                Permanences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-4 text-sm text-muted-foreground">
                Permanence administrative chaque jeudi de 18h à 20h à la Maison de Quartier.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/a-propos">En savoir plus</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Email affiché en bas */}
      <p className="text-center text-xs text-muted-foreground">
        Connecté en tant que <strong>{email}</strong>
      </p>
    </div>
  );
}
