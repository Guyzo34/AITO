import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ACTUALITES, CATEGORIE_COLORS, CATEGORIES } from "@/lib/data/actualites";

export const metadata: Metadata = {
  title: "Actualités",
  description: "Restez informé de toutes les actualités, événements et annonces de l'AITO."
};

export default function ActualitesPage() {
  /* Trier par date décroissante */
  const actualites = [...ACTUALITES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="bg-muted px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Actualités</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Retrouvez toutes les nouvelles, événements et annonces de l'AITO
          </p>
        </div>
      </div>

      {/* Liste des actualités */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-6">
          {actualites.map((actu) => {
            const colors = CATEGORIE_COLORS[actu.categorie];
            return (
              <Link key={actu.id} href={`/actualites/${actu.slug}`} className="group block">
                <Card className="transition hover:border-primary/30 hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:gap-6">
                    {/* Badge catégorie */}
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:w-32">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {CATEGORIES[actu.categorie]}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3.5" />
                        {new Date(actu.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1">
                      <h2 className="font-display text-xl font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                        {actu.titre}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{actu.resume}</p>
                      <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                        Lire l'article
                        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
