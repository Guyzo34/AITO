import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, User, ArrowLeft, Tag } from "lucide-react";
import { getActualiteBySlug, ACTUALITES, CATEGORIE_COLORS, CATEGORIES } from "@/lib/data/actualites";
import { Button } from "@/components/ui/button";

/* Génération statique des slugs connus */
export function generateStaticParams() {
  return ACTUALITES.map((a) => ({ slug: a.slug }));
}

/* Métadonnées dynamiques */
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const actu = getActualiteBySlug(slug);

  if (!actu) {
    return { title: "Article introuvable" };
  }

  return {
    title: actu.titre,
    description: actu.resume
  };
}

/* Page de détail */
export default async function ActualiteDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const actu = getActualiteBySlug(slug);

  if (!actu) {
    notFound();
  }

  const colors = CATEGORIE_COLORS[actu.categorie];

  /* Convertir le markdown simple en paragraphes */
  const paragraphes = actu.contenu
    .split("\n\n")
    .filter((p) => p.trim().length > 0);

  return (
    <div className="bg-background">
      {/* Navigation */}
      <div className="border-b border-border bg-muted px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Button asChild variant="ghost" size="sm">
            <Link href="/actualites">
              <ArrowLeft className="size-4" />
              Retour aux actualités
            </Link>
          </Button>
        </div>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Métadonnées */}
        <header className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
              <Tag className="size-3" />
              {CATEGORIES[actu.categorie]}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              {new Date(actu.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-4" />
              {actu.auteur}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {actu.titre}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{actu.resume}</p>
        </header>

        {/* Séparateur */}
        <div className="mb-8 h-1 w-16 rounded-full bg-primary" />

        {/* Contenu de l'article */}
        <div className="space-y-5 text-base leading-8 text-foreground">
          {paragraphes.map((para, idx) => {
            /* Gestion des titres markdown **titre** */
            if (para.startsWith("**") && para.endsWith("**")) {
              return (
                <h2 key={idx} className="font-display text-xl font-semibold text-foreground">
                  {para.replace(/\*\*/g, "")}
                </h2>
              );
            }

            /* Gestion des listes */
            if (para.includes("\n- ")) {
              const lines = para.split("\n");
              return (
                <ul key={idx} className="ml-4 space-y-1.5">
                  {lines.map((line, li) =>
                    line.startsWith("- ") ? (
                      <li key={li} className="flex items-start gap-2 text-foreground">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        {line.replace("- ", "").replace(/\*\*/g, "")}
                      </li>
                    ) : line.trim() ? (
                      <p key={li} className="text-foreground">{line}</p>
                    ) : null
                  )}
                </ul>
              );
            }

            /* Paragraphe standard — nettoyer le gras markdown */
            return (
              <p key={idx} className="text-muted-foreground">
                {para.replace(/\*\*/g, "")}
              </p>
            );
          })}
        </div>
      </article>
    </div>
  );
}
