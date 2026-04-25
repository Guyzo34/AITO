"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Calendar, DollarSign, Filter, Globe, Heart, MapPin, Megaphone, Package, Palette, ShoppingBag, Target, TrendingUp, Upload, Users, Volume2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
const blueprints = {
    creative_studio: {
        title: "Creative Studio",
        description: "Concepts créatifs, contenus visuels et déclinaisons social media.",
        icon: Palette,
        jobType: "creative_studio_generation",
        questions: [
            { key: "objective", label: "Objectif créatif", placeholder: "Lancer une nouvelle collection et générer de la considération." },
            { key: "deliverables", label: "Formats attendus", placeholder: "3 concepts statiques, 1 storyboard, 5 variations social ads." },
            { key: "callToAction", label: "Call-to-action", placeholder: "Découvrir la collection, réserver une démo, demander un devis..." }
        ]
    },
    website_builder: {
        title: "Website Builder",
        description: "Landing pages, architecture éditoriale et expériences web prêtes à produire.",
        icon: Globe,
        jobType: "website_builder_generation",
        questions: [
            { key: "siteGoal", label: "Objectif du site", placeholder: "Convertir vers une démo, capturer des leads, présenter une offre premium." },
            { key: "sections", label: "Sections indispensables", placeholder: "Hero, bénéfices, preuves sociales, FAQ, formulaire de contact." },
            { key: "references", label: "Références design", placeholder: "Sites inspirants, univers graphiques ou expériences à citer." }
        ]
    },
    voiceover: {
        title: "Voiceover",
        description: "Voix, scripts et déclinaisons audio pour vidéos, ads ou narration produit.",
        icon: Volume2,
        jobType: "voiceover_generation",
        questions: [
            { key: "script", label: "Script ou angle narratif", placeholder: "Texte à interpréter ou intention à construire." },
            { key: "voiceStyle", label: "Style de voix", placeholder: "Chaleureux, premium, rassurant, énergique, cinématographique..." },
            { key: "duration", label: "Durée cible", placeholder: "15 sec, 30 sec, 1 min, version longue..." }
        ]
    },
    paid_media: {
        title: "Paid Media",
        description: "Angles d'acquisition, structures d'annonces et recommandations média.",
        icon: Megaphone,
        jobType: "paid_media_generation",
        questions: [
            { key: "offer", label: "Offre à pousser", placeholder: "Produit, promotion, lead magnet ou service à mettre en avant." },
            { key: "channels", label: "Canaux ciblés", placeholder: "Meta, Google, TikTok, LinkedIn..." },
            { key: "budget", label: "Budget ou ambition média", placeholder: "Budget test, budget mensuel, CPA cible..." }
        ]
    },
    // Phase 2a – Family C: Web & E-commerce
    website_multilang: {
        title: "Site Multilingue",
        description: "Architecture et contenus adaptés culturellement pour 10+ langues et marchés.",
        icon: Globe,
        jobType: "website_multilang_generation",
        questions: [
            { key: "languages", label: "Langues cibles", placeholder: "Anglais, Espagnol, Arabe, Japonais..." },
            { key: "siteType", label: "Type de site", placeholder: "Vitrine, e-commerce, SaaS, landing page..." },
            { key: "pages", label: "Pages prioritaires", placeholder: "Home, À propos, Services, Contact..." }
        ]
    },
    funnel_builder: {
        title: "Funnel Builder",
        description: "Funnels de conversion complets avec textes, emails et séquences de suivi.",
        icon: Filter,
        jobType: "funnel_builder_generation",
        questions: [
            { key: "offer", label: "Offre principale", placeholder: "Produit, service ou formation à vendre." },
            { key: "funnelType", label: "Type de funnel", placeholder: "Vente directe, lead generation, webinar, tripwire..." },
            { key: "conversionGoal", label: "Objectif de conversion", placeholder: "Vente, prise de RDV, inscription newsletter..." }
        ]
    },
    agency_delivery: {
        title: "Agency Delivery",
        description: "Pack de livraison agence professionnel: executive summary, guide client et facturation.",
        icon: Package,
        jobType: "agency_delivery_generation",
        questions: [
            { key: "clientName", label: "Nom du client", placeholder: "Nom de la marque ou entreprise cliente." },
            { key: "projectScope", label: "Périmètre du projet", placeholder: "Campagne social ads, refonte site, stratégie de contenu..." },
            { key: "deliverables", label: "Livrables inclus", placeholder: "Charte graphique, 10 visuels, 5 copies, rapport mensuel..." }
        ]
    },
    shop_builder: {
        title: "Shop Builder",
        description: "Architecture boutique e-commerce optimisée avec pages, catégories et checkout.",
        icon: ShoppingBag,
        jobType: "shop_builder_generation",
        questions: [
            { key: "shopType", label: "Type de boutique", placeholder: "Mode, beauté, tech, alimentation, services numériques..." },
            { key: "categories", label: "Catégories de produits", placeholder: "Vêtements femme, accessoires, outlet..." },
            { key: "platform", label: "Plateforme technique", placeholder: "Shopify, WooCommerce, PrestaShop, autre..." }
        ]
    },
    ecommerce_growth: {
        title: "E-commerce Growth",
        description: "Fiches produits SEO optimisées et stratégie de croissance multi-leviers.",
        icon: TrendingUp,
        jobType: "ecommerce_growth_generation",
        questions: [
            { key: "products", label: "Produits à optimiser", placeholder: "Liste des produits phares à optimiser." },
            { key: "targetKeywords", label: "Mots-clés cibles", placeholder: "Chaussures de running, montre connectée, sac cuir..." },
            { key: "growthLevers", label: "Leviers de croissance", placeholder: "SEO, conversion, panier moyen, rétention..." }
        ]
    },
    // Phase 2a – Family D: Social Media
    social_automation: {
        title: "Social Automation",
        description: "Calendrier éditorial 30 jours avec captions, hashtags et horaires optimaux.",
        icon: Calendar,
        jobType: "social_automation_generation",
        questions: [
            { key: "platforms", label: "Plateformes", placeholder: "Instagram, Facebook, LinkedIn, TikTok..." },
            { key: "contentMix", label: "Mix de contenu", placeholder: "40% éducatif, 30% divertissement, 20% promo, 10% engagement." },
            { key: "frequency", label: "Fréquence de publication", placeholder: "1x/jour, 3x/semaine, 5x/semaine..." }
        ]
    },
    facebook_growth: {
        title: "Facebook Growth",
        description: "Stratégie FB organique avec scripts Reels, piliers de contenu et plan de milestones.",
        icon: Users,
        jobType: "facebook_growth_generation",
        questions: [
            { key: "pageType", label: "Type de page", placeholder: "Business, personnalité, communauté, e-commerce..." },
            { key: "currentFollowers", label: "Abonnés actuels", placeholder: "500, 2000, 10000..." },
            { key: "contentTypes", label: "Types de contenu", placeholder: "Reels, posts texte, vidéos, événements..." }
        ]
    },
    social_engagement: {
        title: "Social Engagement",
        description: "Kit de réponses commentaires, DM templates et protocoles de gestion communauté.",
        icon: Heart,
        jobType: "social_engagement_generation",
        questions: [
            { key: "platforms", label: "Plateformes", placeholder: "Instagram, Facebook, TikTok, LinkedIn..." },
            { key: "brandVoice", label: "Voix de marque", placeholder: "Chaleureux et accessible, premium et formel, fun et décalé..." },
            { key: "commentTypes", label: "Situations à couvrir", placeholder: "Questions produits, plaintes, compliments, demandes de prix..." }
        ]
    },
    social_monetization: {
        title: "Social Monetization",
        description: "Plan de monétisation social media avec canaux, produits numériques et projections.",
        icon: DollarSign,
        jobType: "social_monetization_generation",
        questions: [
            { key: "platforms", label: "Plateformes", placeholder: "Instagram, YouTube, TikTok..." },
            { key: "audienceSize", label: "Taille d'audience", placeholder: "5k, 50k, 200k abonnés..." },
            { key: "monetizationChannels", label: "Canaux de monétisation", placeholder: "Produits numériques, coaching, affiliation, sponsoring..." }
        ]
    },
    // Phase 2a – Family E: Ads & CRM
    ads_warrior: {
        title: "Ads Warrior",
        description: "Campagnes multi-plateformes complètes avec copies A/B, ciblages et playbook d'optimisation.",
        icon: Target,
        jobType: "ads_warrior_generation",
        questions: [
            { key: "platforms", label: "Plateformes ads", placeholder: "Facebook/Meta, Google, TikTok, LinkedIn..." },
            { key: "totalBudget", label: "Budget total", placeholder: "500€/mois, 2000€ campagne, 10k€ trimestre..." },
            { key: "campaignObjective", label: "Objectif de campagne", placeholder: "Ventes, leads, trafic, notoriété, applications..." }
        ]
    },
    crm_loyalty: {
        title: "CRM Loyalty",
        description: "Programme de fidélité, automations email et stratégie de rétention client.",
        icon: Award,
        jobType: "crm_loyalty_generation",
        questions: [
            { key: "programType", label: "Type de programme", placeholder: "Points, niveaux, cashback, abonnement, hybride..." },
            { key: "customerSegments", label: "Segments clients", placeholder: "VIP, réguliers, inactifs depuis 90 jours..." },
            { key: "retentionGoal", label: "Objectif de rétention", placeholder: "Réduire le churn de 30%, augmenter LTV, réactiver dormants..." }
        ]
    },
    // Phase 2a – Family H: Membership & Local
    membership_builder: {
        title: "Membership Builder",
        description: "Espace membre complet avec tiers, curriculum, onboarding et mécanismes de rétention.",
        icon: Users,
        jobType: "membership_builder_generation",
        questions: [
            { key: "tiers", label: "Niveaux d'accès", placeholder: "Starter, Pro, VIP, ou Mensuel/Annuel/Lifetime..." },
            { key: "contentTypes", label: "Types de contenu membre", placeholder: "Vidéos de formation, templates, sessions live, coaching..." },
            { key: "platform", label: "Plateforme", placeholder: "Podia, MemberSpace, Kajabi, Circle, Notion..." }
        ]
    },
    local_growth: {
        title: "Local Growth",
        description: "Plan d'acquisition locale avec optimisation GMB, SEO local et partenariats.",
        icon: MapPin,
        jobType: "local_growth_generation",
        questions: [
            { key: "businessType", label: "Type de business", placeholder: "Restaurant, cabinet médical, agence, commerce de détail..." },
            { key: "location", label: "Zone géographique", placeholder: "Paris 11e, Lyon, Bordeaux, région PACA..." },
            { key: "acquisitionChannels", label: "Canaux d'acquisition", placeholder: "GMB, réseaux sociaux, flyers, partenariats locaux..." }
        ]
    }
};
export default function NewProjectPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { brands, currentOrganization, session } = useAuth();
    const [pending, setPending] = useState(false);
    const [agentType, setAgentType] = useState("creative_studio");
    const [title, setTitle] = useState("");
    const [brandId, setBrandId] = useState("");
    const [summary, setSummary] = useState("");
    const [referenceLinks, setReferenceLinks] = useState("");
    const [answers, setAnswers] = useState({});
    const [files, setFiles] = useState([]);
    const blueprint = useMemo(() => blueprints[agentType], [agentType]);
    async function handleSubmit(event) {
        event.preventDefault();
        if (!session?.access_token || !currentOrganization) {
            toast({
                title: "Session indisponible",
                description: "Reconnectez-vous avant de créer un projet.",
                variant: "destructive"
            });
            return;
        }
        setPending(true);
        try {
            const references = referenceLinks
                .split(/\r?\n/)
                .map((value) => value.trim())
                .filter(Boolean);
            const project = await apiClient.createProject(session.access_token, {
                organizationId: currentOrganization.id,
                agentType,
                title,
                status: "active",
                ...(brandId ? { brandId } : {})
            });
            const lines = [
                `Titre du projet: ${title}`,
                `Agent: ${blueprint.title}`,
                `Résumé: ${summary}`,
                ...blueprint.questions.map((question) => `${question.label}: ${answers[question.key] ?? ""}`),
                `Références: ${references.join(", ") || "Aucune"}`,
                `Fichiers: ${files.map((file) => `${file.name} (${file.type || "type inconnu"})`).join(", ") || "Aucun"}`
            ];
            const brief = await apiClient.createBrief(session.access_token, project.id, {
                rawInputText: lines.join("\n"),
                parsedBriefJson: {
                    summary,
                    answers,
                    referenceLinks: references,
                    files,
                    agentType
                },
                attachmentsJson: {
                    referenceLinks: references,
                    files
                },
                status: "submitted"
            });
            await apiClient.createJob(session.access_token, project.id, {
                briefId: brief.id,
                jobType: blueprint.jobType,
                priority: 10
            });
            toast({
                title: "Projet créé",
                description: "Le brief a été soumis et le job est en file d’attente."
            });
            router.push(`/projets/${project.id}`);
        }
        catch (error) {
            toast({
                title: "Création impossible",
                description: error instanceof Error ? error.message : "Le projet n’a pas pu être créé.",
                variant: "destructive"
            });
        }
        finally {
            setPending(false);
        }
    }
    return (<div className="space-y-8">
      <section className="surface mesh-panel rounded-[2rem] border p-6 sm:p-8">
        <p className="font-display text-sm uppercase tracking-[0.35em] text-primary">Nouveau projet</p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">Choisissez l’agent, structurez le brief, lancez.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Chaque type d’agent active un formulaire dédié. Les références et pièces jointes sont encapsulées dans le
          brief pour alimenter le workflow backend existant.
        </p>
      </section>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <section className="grid gap-4 xl:grid-cols-4">
          {Object.entries(blueprints).map(([key, item]) => (<button key={key} type="button" className={`surface rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-1 ${agentType === key ? "border-primary/70 shadow-[0_0_0_1px_rgba(102,246,255,0.45)]" : "border-white/10"}`} onClick={() => setAgentType(key)}>
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-2xl border border-white/10 bg-white/5 p-3 text-primary">
                  <item.icon className="size-5"/>
                </span>
                <Badge variant={agentType === key ? "default" : "outline"}>{item.title}</Badge>
              </div>
              <h2 className="mt-5 font-display text-2xl">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
            </button>))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="surface border-white/10">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Brief principal</CardTitle>
              <CardDescription>Les champs ci-dessous sont adaptés à l’agent sélectionné.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-title">Nom du projet</Label>
                  <Input id="project-title" placeholder="Campagne lancement été 2026" value={title} onChange={(event) => setTitle(event.target.value)}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-id">Marque associée</Label>
                  <Select id="brand-id" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
                    <option value="">Aucune marque</option>
                    {brands.map((brand) => (<option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-summary">Contexte / enjeu</Label>
                <Textarea id="project-summary" placeholder="Exposez l’objectif business, les contraintes, l’échéance et le niveau d’exigence." value={summary} onChange={(event) => setSummary(event.target.value)} rows={5}/>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {blueprint.questions.map((question) => (<div key={question.key} className="space-y-2">
                    <Label htmlFor={question.key}>{question.label}</Label>
                    <Textarea id={question.key} placeholder={question.placeholder} value={answers[question.key] ?? ""} onChange={(event) => setAnswers((current) => ({
                ...current,
                [question.key]: event.target.value
            }))} rows={4}/>
                  </div>))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Références & fichiers</CardTitle>
                <CardDescription>Le backend stocke les métadonnées dans `attachmentsJson` du brief.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reference-links">Liens de référence</Label>
                  <Textarea id="reference-links" placeholder="Un lien par ligne : page inspiration, moodboard, campagne concurrente..." rows={5} value={referenceLinks} onChange={(event) => setReferenceLinks(event.target.value)}/>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="file-upload">Fichiers</Label>
                  <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center">
                    <Upload className="size-6 text-primary"/>
                    <span className="text-sm text-muted-foreground">
                      Déposez vos assets, logos, scripts ou inspirations
                    </span>
                  </label>
                  <input id="file-upload" type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []).map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        })))}/>
                  {files.length > 0 ? (<div className="space-y-2">
                      {files.map((file) => (<div key={`${file.name}-${file.lastModified}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                          <p className="font-medium">{file.name}</p>
                          <p className="mt-1 text-muted-foreground">
                            {file.type || "type inconnu"} · {(file.size / 1024).toFixed(1)} Ko
                          </p>
                        </div>))}
                    </div>) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="surface border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Prévisualisation du workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>
                  <span className="text-foreground">1.</span> Création du projet dans l’organisation cliente.
                </p>
                <p>
                  <span className="text-foreground">2.</span> Soumission du brief structuré avec références.
                </p>
                <p>
                  <span className="text-foreground">3.</span> Lancement automatique d’un job `{blueprint.jobType}`.
                </p>
                <Button className="w-full" disabled={pending} type="submit">
                  Lancer le projet
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </form>
    </div>);
}
