"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderKanban, Layers3, Plus, TimerReset } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const projectStatusLabel = {
    draft: "Brouillon",
    active: "Actif",
    paused: "En pause",
    completed: "Terminé",
    archived: "Archivé"
};
const jobStatusLabel = {
    queued: "En file",
    running: "En cours",
    completed: "Livré",
    failed: "Échec",
    canceled: "Annulé"
};
export default function DashboardPage() {
    const { toast } = useToast();
    const { session, currentOrganization } = useAuth();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const loadProjects = useCallback(async () => {
        if (!session?.access_token || !currentOrganization) {
            setProjects([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiClient.getProjects(session.access_token, currentOrganization.id);
            setProjects(data);
        }
        catch (error) {
            toast({
                title: "Chargement impossible",
                description: error instanceof Error ? error.message : "Impossible de récupérer vos projets.",
                variant: "destructive"
            });
        }
        finally {
            setIsLoading(false);
        }
    }, [currentOrganization, session?.access_token, toast]);
    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);
    const stats = useMemo(() => [
        {
            label: "Projets actifs",
            value: projects.filter((project) => project.status === "active").length,
            icon: Layers3
        },
        {
            label: "En production",
            value: projects.filter((project) => project.jobs[0]?.status === "running").length,
            icon: TimerReset
        },
        {
            label: "Total projets",
            value: projects.length,
            icon: FolderKanban
        }
    ], [projects]);
    return (<div className="space-y-8">
      <section className="surface mesh-panel rounded-[2rem] border p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-display text-sm uppercase tracking-[0.35em] text-primary">Dashboard client</p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl">Vos projets, vos briefs, votre cadence.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Centralisez la production de vos agents Creative Studio, Website Builder, Voiceover et Paid Media dans
              une vue orientée décisions.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/projets/nouveau">
              <Plus className="size-4"/>
              Nouveau projet
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {stats.map((stat) => (<Card key={stat.label} className="surface border-white/10">
            <CardHeader className="pb-3">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="flex items-center justify-between font-display text-4xl">
                {stat.value}
                <span className="rounded-2xl border border-white/10 bg-white/5 p-3 text-primary">
                  <stat.icon className="size-5"/>
                </span>
              </CardTitle>
            </CardHeader>
          </Card>))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Projets récents</h2>
            <p className="mt-1 text-sm text-muted-foreground">Accès direct au suivi, aux statuts et aux livrables.</p>
          </div>
          <Button onClick={() => void loadProjects()} variant="outline">
            Rafraîchir
          </Button>
        </div>

        {isLoading ? (<div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (<div key={index} className="surface h-48 animate-pulse rounded-[1.75rem] border"/>))}
          </div>) : projects.length === 0 ? (<Card className="surface border-dashed border-white/10">
            <CardContent className="flex flex-col items-start gap-4 py-10">
              <Badge variant="secondary">Aucun projet</Badge>
              <div>
                <h3 className="font-display text-2xl">Lancez votre premier workflow</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Créez un projet, associez un brief et laissez l’agent concerné démarrer la production.
                </p>
              </div>
              <Button asChild>
                <Link href="/projets/nouveau">
                  <Plus className="size-4"/>
                  Créer un projet
                </Link>
              </Button>
            </CardContent>
          </Card>) : (<div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => {
                const latestJob = project.jobs[0];
                return (<Card key={project.id} className="surface overflow-hidden border-white/10">
                  <CardHeader className="gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardDescription>{project.brand?.name ?? "Sans marque associée"}</CardDescription>
                        <CardTitle className="mt-2 font-display text-2xl">{project.title}</CardTitle>
                      </div>
                      <Badge>{projectStatusLabel[project.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{project.agentType.replaceAll("_", " ")}</Badge>
                      {latestJob ? (<Badge variant="outline">{jobStatusLabel[latestJob.status]}</Badge>) : (<Badge variant="outline">Aucun job lancé</Badge>)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground/80">Créé le</p>
                        <p className="mt-1 text-foreground">
                          {new Date(project.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                    })}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground/80">Job récent</p>
                        <p className="mt-1 text-foreground">{latestJob?.jobType ?? "En attente de lancement"}</p>
                      </div>
                    </div>
                    <Button asChild className="w-full justify-between">
                      <Link href={`/projets/${project.id}`}>
                        Ouvrir le projet
                        <ArrowRight className="size-4"/>
                      </Link>
                    </Button>
                  </CardContent>
                </Card>);
            })}
          </div>)}
      </section>
    </div>);
}
