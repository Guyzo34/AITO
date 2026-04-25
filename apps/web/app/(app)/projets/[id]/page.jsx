"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Download, ExternalLink, RefreshCcw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    completed: "Terminé",
    failed: "Échec",
    canceled: "Annulé"
};
const stepStatusWidth = {
    pending: 20,
    running: 65,
    completed: 100,
    failed: 100,
    skipped: 100
};
export default function ProjectDetailPage() {
    const params = useParams();
    const { toast } = useToast();
    const { session } = useAuth();
    const [project, setProject] = useState(null);
    const [job, setJob] = useState(null);
    const [deliverables, setDeliverables] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);
    const activeJob = useMemo(() => project?.jobs[0] ?? null, [project]);
    const loadProject = useCallback(async () => {
        if (!session?.access_token || !params.id) {
            return;
        }
        setIsLoading(true);
        try {
            const nextProject = await apiClient.getProject(session.access_token, params.id);
            setProject(nextProject);
            const latestJobId = nextProject.jobs[0]?.id;
            const [nextJob, nextDeliverables] = await Promise.all([
                latestJobId ? apiClient.getJob(session.access_token, latestJobId) : Promise.resolve(null),
                apiClient.getProjectDeliverables(session.access_token, params.id)
            ]);
            setJob(nextJob);
            setDeliverables(nextDeliverables);
        }
        catch (error) {
            toast({
                title: "Chargement impossible",
                description: error instanceof Error ? error.message : "Le projet n’a pas pu être chargé.",
                variant: "destructive"
            });
        }
        finally {
            setIsLoading(false);
        }
    }, [params.id, session?.access_token, toast]);
    useEffect(() => {
        void loadProject();
    }, [loadProject]);
    useEffect(() => {
        if (!session?.access_token || !activeJob || !["queued", "running"].includes(activeJob.status)) {
            return;
        }
        const timer = window.setInterval(() => {
            void loadProject();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [activeJob, loadProject, session?.access_token]);
    async function handleRetry() {
        if (!session?.access_token || !activeJob) {
            return;
        }
        setIsRetrying(true);
        try {
            await apiClient.retryJob(session.access_token, activeJob.id);
            toast({
                title: "Job relancé",
                description: "Le job a été replacé dans la file de traitement."
            });
            await loadProject();
        }
        catch (error) {
            toast({
                title: "Relance impossible",
                description: error instanceof Error ? error.message : "Le job n’a pas pu être relancé.",
                variant: "destructive"
            });
        }
        finally {
            setIsRetrying(false);
        }
    }
    const attachmentData = project?.briefs[0]?.attachmentsJson ?? { referenceLinks: [], files: [] };
    return (<div className="space-y-8">
      {isLoading && !project ? (<div className="space-y-4">
          <div className="surface h-40 animate-pulse rounded-[2rem] border"/>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="surface h-96 animate-pulse rounded-[2rem] border"/>
            <div className="surface h-96 animate-pulse rounded-[2rem] border"/>
          </div>
        </div>) : project ? (<>
          <section className="surface mesh-panel rounded-[2rem] border p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <Badge>{projectStatusLabel[project.status]}</Badge>
                  <Badge variant="secondary">{project.agentType.replaceAll("_", " ")}</Badge>
                  {activeJob ? <Badge variant="outline">{jobStatusLabel[activeJob.status]}</Badge> : null}
                </div>
                <h1 className="mt-5 font-display text-4xl sm:text-5xl">{project.title}</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {project.brand?.name
                ? `Projet relié à la marque ${project.brand.name}.`
                : "Aucune marque n’est encore associée à ce projet."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void loadProject()}>
                  <RefreshCcw className="size-4"/>
                  Rafraîchir
                </Button>
                {activeJob?.status === "failed" ? (<Button disabled={isRetrying} onClick={handleRetry}>
                    Relancer le job
                  </Button>) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-3xl">Progression du job</CardTitle>
                <CardDescription>Le statut est rafraîchi automatiquement toutes les 5 secondes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {job?.jobSteps.length ? (job.jobSteps.map((step) => (<div key={step.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{step.stepName}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {step.status}
                          </p>
                        </div>
                        <Badge variant="outline">{step.status}</Badge>
                      </div>
                      <Progress className="mt-4" value={stepStatusWidth[step.status]}/>
                    </div>))) : activeJob ? (<div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                    <p className="font-medium text-foreground">Pipeline principal</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Le worker n’a pas encore détaillé les étapes, mais le job `{activeJob.jobType}` est bien
                      enregistré avec le statut <span className="text-foreground">{jobStatusLabel[activeJob.status]}</span>.
                    </p>
                    <Progress className="mt-4" value={activeJob.status === "completed" ? 100 : activeJob.status === "running" ? 60 : 25}/>
                  </div>) : (<div className="rounded-[1.5rem] border border-dashed border-white/10 p-5 text-sm text-muted-foreground">
                    Aucun job n’a encore été lancé pour ce projet.
                  </div>)}

                {job?.errorMessage ? (<div className="rounded-[1.5rem] border border-danger/40 bg-danger/10 p-4 text-sm text-red-100">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="size-4"/>
                      Erreur remontée par le backend
                    </div>
                    <p className="mt-2 leading-7">{job.errorMessage}</p>
                  </div>) : null}
              </CardContent>
            </Card>

            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-3xl">Brief & références</CardTitle>
                <CardDescription>Récapitulatif du dernier brief soumis au projet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {project.briefs[0]?.rawInputText ?? "Aucun brief disponible pour ce projet."}
                  </p>
                </div>

                {attachmentData.referenceLinks?.length ? (<div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Références</p>
                    <div className="space-y-2">
                      {attachmentData.referenceLinks.map((link) => (<Link key={link} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10" href={link} rel="noreferrer" target="_blank">
                          <span className="truncate">{link}</span>
                          <ExternalLink className="size-4 shrink-0 text-primary"/>
                        </Link>))}
                    </div>
                  </div>) : null}

                {attachmentData.files?.length ? (<div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Fichiers déclarés</p>
                    <div className="space-y-2">
                      {attachmentData.files.map((file) => (<div key={file.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                          <p className="font-medium">{file.name}</p>
                          <p className="mt-1 text-muted-foreground">{file.type ?? "type inconnu"}</p>
                        </div>))}
                    </div>
                  </div>) : null}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-3xl">Livrables disponibles</CardTitle>
                <CardDescription>Téléchargement via URLs signées générées par l’API backend.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliverables?.assets.length || job?.assets.length ? ([...(deliverables?.assets ?? []), ...(job?.assets ?? [])].map((asset) => (<div key={`${asset.id}-${asset.storagePath}`} className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{asset.storagePath.split("/").at(-1) ?? asset.storagePath}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {asset.assetType} · {asset.mimeType}
                        </p>
                      </div>
                      {asset.downloadUrl ? (<Button asChild>
                          <Link href={asset.downloadUrl} target="_blank">
                            <Download className="size-4"/>
                            Télécharger
                          </Link>
                        </Button>) : (<Button disabled variant="secondary">
                          Stockage privé
                        </Button>)}
                    </div>))) : (<div className="rounded-[1.5rem] border border-dashed border-white/10 p-5 text-sm text-muted-foreground">
                    Les livrables apparaîtront ici dès qu’un asset ou une livraison sera associé au projet.
                  </div>)}
              </CardContent>
            </Card>

            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-3xl">Synthèse opérationnelle</CardTitle>
                <CardDescription>Vue rapide sur le job courant et l’historique du projet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dernier job</p>
                    <p className="mt-2 font-display text-xl">{activeJob?.jobType ?? "Aucun"}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Statut</p>
                    <p className="mt-2 font-display text-xl">
                      {activeJob ? jobStatusLabel[activeJob.status] : "En attente"}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Livraisons enregistrées</p>
                  <p className="mt-3 text-3xl font-display">{deliverables?.deliveries.length ?? 0}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Runs IA tracés</p>
                  <p className="mt-3 text-3xl font-display">{job?.agentRuns.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </>) : null}
    </div>);
}
