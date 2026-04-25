import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Users, Globe, BookOpen, Calendar, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActualitesRecentes, CATEGORIE_COLORS } from "@/lib/data/actualites";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Bienvenue à l'AIMH — Amicale des Ivoiriens de Montpellier et Hérault. Rejoignez la communauté ivoirienne de la région."
};

/* Valeurs de l'association */
const VALEURS = [
  {
    icon: Heart,
    titre: "Solidarité",
    description:
      "Nous nous entraidons dans les moments difficiles. Chaque membre peut compter sur le soutien de la communauté."
  },
  {
    icon: Globe,
    titre: "Culture",
    description:
      "Préserver et promouvoir la richesse culturelle ivoirienne : arts, langues, gastronomie et traditions."
  },
  {
    icon: Users,
    titre: "Communauté",
    description:
      "Créer des liens durables entre les Ivoiriens et amis de la Côte d'Ivoire installés à Montpellier et en Hérault."
  },
  {
    icon: BookOpen,
    titre: "Éducation",
    description:
      "Accompagner nos membres et leurs enfants dans leur parcours scolaire, universitaire et professionnel."
  }
];

export default function HomePage() {
  const actualitesRecentes = getActualitesRecentes(3);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* ── Section Hero ── */}
      <section className="hero-pattern relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Texte */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                <span className="size-2 rounded-full bg-secondary" />
                Communauté ivoirienne à Montpellier
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Ensemble, nous formons une{" "}
                <span className="text-gradient-orange">grande famille</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                L'Amicale des Ivoiriens de Montpellier et Hérault unit les Ivoiriens de la région autour
                de valeurs de <strong>solidarité</strong>, de <strong>culture</strong> et d'<strong>entraide</strong>.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                  <Link href="/inscription">
                    Rejoindre l'AIMH
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/a-propos">En savoir plus</Link>
                </Button>
              </div>
            </div>

            {/* Illustration / Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { chiffre: "200+", label: "Membres actifs" },
                { chiffre: "10+", label: "Années d'existence" },
                { chiffre: "50+", label: "Événements organisés" },
                { chiffre: "100%", label: "Bénévoles engagés" }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-6 text-center card-shadow"
                >
                  <p className="font-display text-3xl font-bold text-primary">{stat.chiffre}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Valeurs ── */}
      <section className="bg-muted px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">Nos valeurs</h2>
            <p className="mt-3 text-muted-foreground">Ce qui nous unit et guide notre action au quotidien</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALEURS.map((valeur) => (
              <Card key={valeur.titre} className="group transition hover:border-primary/30">
                <CardContent className="pt-6">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                    <valeur.icon className="size-6" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">{valeur.titre}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{valeur.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section Actualités récentes ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Actualités</h2>
              <p className="mt-2 text-muted-foreground">Les dernières nouvelles de la communauté</p>
            </div>
            <Link
              href="/actualites"
              className="hidden items-center gap-1 text-sm font-medium text-primary transition hover:underline sm:flex"
            >
              Voir toutes les actualités
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {actualitesRecentes.map((actu) => {
              const colors = CATEGORIE_COLORS[actu.categorie];
              return (
                <Link key={actu.id} href={`/actualites/${actu.slug}`} className="group">
                  <Card className="h-full transition hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex h-full flex-col pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {actu.categorie.charAt(0).toUpperCase() + actu.categorie.slice(1)}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3.5" />
                          {new Date(actu.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                      <h3 className="mb-2 font-display text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                        {actu.titre}
                      </h3>
                      <p className="flex-1 text-sm leading-7 text-muted-foreground">{actu.resume}</p>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                        Lire la suite
                        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button asChild variant="outline">
              <Link href="/actualites">Toutes les actualités</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Section CTA ── */}
      <section className="bg-primary px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Rejoignez la famille AIMH
          </h2>
          <p className="mt-4 text-lg leading-8 opacity-90">
            Devenez membre et bénéficiez des activités, de l'accompagnement et du soutien de toute la communauté ivoirienne de Montpellier.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              className="bg-white text-primary hover:bg-white/90"
              size="lg"
            >
              <Link href="/inscription">
                S'inscrire gratuitement
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10"
              size="lg"
            >
              <Link href="/contact">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
