# Architecture technique Phase 1

## 1) Résumé exécutif

Pour une **Phase 1** portée par un **solo entrepreneur avec budget limité**, je recommande une architecture **TypeScript full-stack**, **monorepo**, avec un **frontend Next.js**, un **backend API Fastify**, une **base PostgreSQL managée**, une **file de jobs basée sur PostgreSQL** et un **worker dédié** pour les traitements longs.

L'objectif est de maximiser :

- la **simplicité opérationnelle**
- le **coût minimal au démarrage**
- la **vitesse de développement**
- la **scalabilité progressive** sans sur-ingénierie

La proposition ci-dessous privilégie un socle simple à maintenir, tout en permettant d’héberger 4 agents métier :

- **Creative Studio**
- **Website Builder**
- **Voiceover**
- **Paid Media**

et un socle commun :

- intake / brief parser
- orchestrateur
- mémoire client
- QA automatique
- livraison

---

## 2) Stack recommandée avec justification

### 2.1 Frontend

**Recommandation : `Next.js` + `TypeScript` + `Tailwind CSS` + `shadcn/ui`**

#### Pourquoi

- **Next.js** est aujourd’hui le choix le plus rentable pour lancer vite une app web SaaS.
- Il permet de construire :
  - le dashboard client
  - l’authentification côté UI
  - les pages marketing éventuelles
  - les vues de suivi des jobs et livraisons
- Très bon support du **SSR**, du **streaming**, des **route handlers** et de l’écosystème React.
- **Tailwind** accélère fortement le delivery pour une seule personne.
- **shadcn/ui** permet d’obtenir rapidement une interface propre, moderne, personnalisable et non dépendante d’un vendor fermé.

#### Cas d’usage dans ce projet

- dashboard client
- formulaire de brief
- historique des demandes
- page de détails d’un job
- téléchargement/livraison d’assets
- gestion profil / marques / préférences

#### Rejeté

- **Angular** : trop lourd pour une Phase 1 solo.
- **Vue/Nuxt** : très bon, mais l’écosystème SaaS/outillage produit est généralement plus abondant côté React/Next.
- **Frontend séparé SPA pur** : ajoute de la complexité inutile au démarrage.

---

### 2.2 Backend API

**Recommandation : `Fastify` + `TypeScript` + `Zod`**

#### Pourquoi

- **Fastify** est léger, rapide et simple à maintenir.
- Très bon choix pour une API métier claire sans la lourdeur de patterns enterprise.
- S’intègre facilement avec :
  - validation `Zod`
  - documentation OpenAPI
  - middleware auth
  - webhooks fournisseurs IA
- Convient très bien à un backend qui gère :
  - briefs
  - projets
  - jobs
  - orchestration
  - génération de livrables

#### Pourquoi pas NestJS

NestJS est excellent, mais pour un solo entrepreneur il peut ajouter :

- plus de boilerplate
- plus de couches conceptuelles
- plus de temps de maintenance

Je le recommanderais plutôt à partir du moment où l’équipe grandit ou si le domaine devient très complexe.

---

### 2.3 Base de données

**Recommandation : `PostgreSQL` managé**

#### Pourquoi

- robuste
- standard du marché
- relationnel, donc adapté aux liens entre utilisateurs, briefs, jobs, assets et livraisons
- excellent support JSONB pour stocker :
  - briefs parsés
  - paramètres d’agents
  - sorties intermédiaires
  - traces de QA

#### Service recommandé

**Option prioritaire : `Supabase Postgres`**

Pourquoi :

- free tier généreux pour démarrer
- simple à administrer
- bonne DX
- possibilité d’utiliser aussi **Supabase Auth**
- possibilité d’utiliser aussi **Supabase Storage**

Alternative :

- **Neon Postgres** si tu veux découpler DB et auth/storage

---

### 2.4 Authentification

**Recommandation : `Supabase Auth`**

#### Pourquoi

- évite de développer soi-même le cycle auth complet
- email/password, magic link, reset password, gestion session
- peu coûteux à lancer
- bien intégré avec PostgreSQL et RLS si besoin plus tard

#### Positionnement

Pour la Phase 1, l’auth doit rester **simple et fiable**. Il vaut mieux externaliser cette brique plutôt que la coder soi-même.

---

### 2.5 File d’attente / jobs asynchrones

**Recommandation : `pg-boss` sur PostgreSQL**

#### Pourquoi

- évite d’ajouter Redis dès la Phase 1
- réduit le nombre de services à payer et à maintenir
- permet de gérer :
  - jobs longs
  - retries
  - backoff
  - scheduling
  - statuts de job
- très adapté à un volume initial modéré

#### Pourquoi c’est important ici

Les générations de :

- visuels
- voix off
- vidéos éventuelles
- sites web

peuvent durer plusieurs secondes à plusieurs minutes. Il faut donc découpler la requête utilisateur du traitement réel.

#### Quand migrer plus tard

Si le volume explose, migration possible vers :

- **BullMQ + Redis**
- ou un orchestrateur type Temporal / Trigger.dev

Mais ce n’est **pas nécessaire en Phase 1**.

---

### 2.6 Worker / orchestrateur

**Recommandation : service `worker` Node.js séparé**

#### Rôle

- consommer les jobs `pg-boss`
- exécuter les pipelines agents
- appeler les providers IA
- stocker les résultats
- lancer la QA automatique
- générer la livraison finale

#### Pourquoi séparé de l’API

- évite de bloquer les requêtes web
- permet de scaler indépendamment
- isole les traitements longs et les retries

---

### 2.7 Stockage fichiers / assets

**Recommandation Phase 1 : `Supabase Storage`**

#### Pourquoi

- même fournisseur que DB/Auth si Supabase est retenu
- simple à intégrer
- URLs signées
- buckets privés/publics
- suffisant pour :
  - images générées
  - audio voiceover
  - exports zip
  - captures/site bundles

#### Alternative si coût stockage sortant devient critique

- **Cloudflare R2**

R2 devient intéressant plus tard si :

- le volume d’assets augmente fortement
- l’egress devient un sujet de coût

Pour la Phase 1, **Supabase Storage gagne en simplicité**.

---

### 2.8 ORM et contrats de données

**Recommandation : `Prisma`**

#### Pourquoi

- excellent pour démarrer vite
- migrations simples
- typage TypeScript agréable
- bon compromis entre productivité et lisibilité

#### Complément

- **Zod** pour validation d’entrées/sorties API
- types partagés dans le monorepo

---

### 2.9 Hébergement / déploiement

**Recommandation**

- **Frontend web** : `Vercel`
- **API + worker** : `Railway` ou `Fly.io`
- **DB/Auth/Storage** : `Supabase`

#### Pourquoi

- setup rapide
- faible friction opérationnelle
- coûts bas au démarrage
- montée en charge possible ensuite

#### Choix conseillé

Si Remy veut le plus simple possible :

- **Vercel + Supabase + Railway**

C’est probablement le meilleur trio pour lancer vite en solo.

---

## 3) Providers IA recommandés par type

L’idée n’est pas d’avoir un seul provider pour tout, mais de prendre le meilleur compromis **qualité / coût / simplicité** par catégorie.

### 3.1 LLM texte

**Recommandation principale : `OpenAI GPT-5.4-mini`**

#### Usages

- parsing de brief
- reformulation client
- génération de copy
- structures de landing pages
- génération de wireframes textuels
- génération de plans de campagnes Paid Media
- QA textuelle

#### Tarifs officiels relevés

- **input** : **$0.75 / 1M tokens**
- **cached input** : **$0.075 / 1M tokens**
- **output** : **$4.50 / 1M tokens**

#### Estimation simple de coût

Exemples approximatifs :

- **brief parser** : 5k input + 1k output
  - coût ≈ **$0.008**
- **génération d’un plan de campagne** : 10k input + 3k output
  - coût ≈ **$0.021**
- **génération d’une structure de site** : 20k input + 8k output
  - coût ≈ **$0.051**

#### Pourquoi ce choix

- rapport performance/prix intéressant
- API unique pour plusieurs cas d’usage
- bon niveau de polyvalence pour Phase 1

#### Alternative

- utiliser un modèle plus premium uniquement pour les jobs “high value”
- garder le mini comme défaut pour contenir les coûts

---

### 3.2 Génération d’images pour Creative Studio

**Recommandation principale : `fal.ai`**

#### Modèles recommandés

- **Seedream V4** pour génération économique
- **Flux Kontext Pro** pour meilleur contrôle/qualité selon le cas

#### Tarifs officiels relevés

- **Seedream V4** : **$0.03 / image** (base 1MP)
- **Flux Kontext Pro** : **$0.04 / image** (base 1MP)

Les résolutions supérieures sont facturées proportionnellement.

#### Estimation simple de coût

- 4 propositions d’images pour un brief :
  - Seedream ≈ **$0.12**
  - Flux Kontext Pro ≈ **$0.16**
- 20 images générées dans un cycle d’itération :
  - Seedream ≈ **$0.60**
  - Flux Kontext Pro ≈ **$0.80**

#### Pourquoi ce choix

- très bon coût unitaire
- spécialisé génération visuelle
- pertinent pour un studio créatif orienté livraison client

#### Fallback / second provider

**OpenAI GPT-image-2** peut être intéressant pour certains workflows intégrés texte+image.

Tarifs relevés sur la page officielle :

- image input : **$8.00 / 1M tokens**
- image output : **$30.00 / 1M tokens**
- text input : **$5.00 / 1M tokens**

Conclusion :

- **fal.ai** = meilleur choix principal pour le coût image pur
- **OpenAI image** = utile comme option secondaire si besoin d’unification ou d’édition plus intégrée

---

### 3.3 TTS / Voiceover

**Recommandation principale : `ElevenLabs`**

#### Pourquoi

- très bonne qualité perçue pour les voix marketing
- choix de voix large
- bon fit pour :
  - ads voiceover
  - vidéos explicatives
  - intros/outros
  - déclinaisons multilingues

#### Tarifs officiels relevés

- **Free** : **$0** avec **10k crédits/mois**
- **Creator** : **$22/mois** avec **121k crédits/mois**
- **Pro** : **$99/mois** avec **600k crédits/mois**
- **Scale** : **$299/mois** avec **1.8M crédits/mois**

Le plan **Creator** est le meilleur point de départ pour un solo entrepreneur.

#### Estimation simple de coût

À partir de l’équivalence visible sur la page :

- 121k crédits ≈ 121 minutes
- coût approximatif en plan Creator ≈ **$0.18 / minute**
- coût approximatif en plan Pro ≈ **$0.165 / minute**

#### Recommandation concrète

- démarrer avec **Free** pour prototypage interne
- passer à **Creator** dès les premiers clients payants
- réserver **Pro** si le volume mensuel augmente ou si la qualité API avancée devient critique

---

### 3.4 Recommandation provider par agent

#### Creative Studio

- LLM : `OpenAI GPT-5.4-mini`
- image : `fal.ai`
- stockage : `Supabase Storage`

#### Website Builder

- LLM : `OpenAI GPT-5.4-mini`
- génération de code/page : pipeline interne basé sur templates + LLM
- déploiement final éventuel : export statique ou projet Next.js selon le niveau de service

#### Voiceover

- LLM : `OpenAI GPT-5.4-mini` pour script
- TTS : `ElevenLabs`
- stockage : `Supabase Storage`

#### Paid Media

- LLM : `OpenAI GPT-5.4-mini`
- génération d’angles, ad copy, variations, structures de campagnes
- possibilité plus tard d’ajouter des connecteurs Meta/Google Ads

---

## 4) Structure du repo recommandée

## Recommandation : `monorepo`

Pourquoi :

- partage de types
- partage des clients API
- partage des composants UI
- partage des schémas de validation
- un seul flux CI/CD

Pour une équipe d’une personne, le monorepo est plus simple qu’un multi-repo.

### Structure proposée

```text
/
├─ apps/
│  ├─ web/                      # Next.js app client
│  ├─ api/                      # Fastify API
│  └─ worker/                   # Consommation des jobs et orchestration
├─ packages/
│  ├─ ui/                       # Composants UI partagés
│  ├─ config/                   # ESLint, TS, env validation
│  ├─ types/                    # Types partagés
│  ├─ db/                       # Prisma schema + client + migrations
│  ├─ prompts/                  # Prompts versionnés
│  ├─ ai/                       # Wrappers providers IA
│  ├─ workflows/                # Pipelines agents
│  ├─ auth/                     # Helpers auth/session
│  └─ utils/                    # Utilitaires transverses
├─ infra/
│  ├─ railway/
│  ├─ vercel/
│  └─ docker/
├─ docs/
│  ├─ decisions/
│  └─ runbooks/
├─ .env.example
├─ package.json
├─ turbo.json
└─ architecture-phase1.md
```

### Répartition logique

- `apps/web` : interface client
- `apps/api` : endpoints métier
- `apps/worker` : traitements async
- `packages/workflows` : logique agentique réutilisable
- `packages/ai` : abstraction des providers

---

## 5) Schéma de base de données initial

Ci-dessous un modèle de départ volontairement simple mais extensible.

### 5.1 Tables principales

#### `users`

Gestion des utilisateurs authentifiés.

Champs principaux :

- `id`
- `email`
- `full_name`
- `created_at`
- `last_login_at`

#### `organizations`

Permet de modéliser un client/compte entreprise.

Champs principaux :

- `id`
- `name`
- `slug`
- `plan`
- `created_at`

#### `organization_members`

Lien entre utilisateurs et organisations.

Champs principaux :

- `id`
- `organization_id`
- `user_id`
- `role` (`owner`, `member`)

#### `brands`

Mémoire métier du client.

Champs principaux :

- `id`
- `organization_id`
- `name`
- `website_url`
- `industry`
- `target_audience`
- `tone_of_voice`
- `brand_guidelines_json`
- `created_at`

#### `projects`

Unité de travail fonctionnelle.

Exemples :

- campagne créative
- site web
- série de voiceovers
- campagne paid media

Champs principaux :

- `id`
- `organization_id`
- `brand_id`
- `agent_type` (`creative_studio`, `website_builder`, `voiceover`, `paid_media`)
- `title`
- `status`
- `created_by_user_id`
- `created_at`
- `updated_at`

#### `briefs`

Stocke le brief original et sa version structurée.

Champs principaux :

- `id`
- `project_id`
- `raw_input_text`
- `attachments_json`
- `parsed_brief_json`
- `status`
- `created_at`

#### `client_memory_entries`

Mémoire client exploitable par les agents.

Champs principaux :

- `id`
- `organization_id`
- `brand_id`
- `memory_type` (`fact`, `preference`, `constraint`, `approved_copy`, `approved_visual`)
- `key`
- `value_json`
- `source`
- `confidence_score`
- `created_at`

#### `jobs`

Suivi des traitements async.

Champs principaux :

- `id`
- `project_id`
- `brief_id`
- `job_type`
- `status` (`queued`, `running`, `completed`, `failed`, `canceled`)
- `priority`
- `attempt_count`
- `queued_at`
- `started_at`
- `finished_at`
- `error_message`

#### `job_steps`

Trace détaillée d’un job.

Champs principaux :

- `id`
- `job_id`
- `step_name`
- `step_order`
- `status`
- `input_json`
- `output_json`
- `started_at`
- `finished_at`

#### `agent_runs`

Historique des exécutions d’agents.

Champs principaux :

- `id`
- `job_id`
- `agent_type`
- `model_provider`
- `model_name`
- `input_tokens`
- `output_tokens`
- `estimated_cost_usd`
- `status`
- `started_at`
- `finished_at`

#### `assets`

Tous les fichiers générés ou importés.

Champs principaux :

- `id`
- `organization_id`
- `project_id`
- `job_id`
- `asset_type` (`image`, `audio`, `document`, `archive`, `code_bundle`, `preview`)
- `storage_bucket`
- `storage_path`
- `mime_type`
- `size_bytes`
- `metadata_json`
- `created_at`

#### `deliveries`

Objet final remis au client.

Champs principaux :

- `id`
- `project_id`
- `job_id`
- `delivery_type`
- `summary_text`
- `status`
- `delivered_at`

#### `qa_reports`

Résultat du contrôle qualité automatique.

Champs principaux :

- `id`
- `project_id`
- `job_id`
- `score`
- `checks_json`
- `issues_json`
- `approved`
- `created_at`

#### `usage_events`

Base pour le pilotage des coûts.

Champs principaux :

- `id`
- `organization_id`
- `project_id`
- `job_id`
- `provider`
- `metric_type`
- `quantity`
- `estimated_cost_usd`
- `metadata_json`
- `created_at`

---

### 5.2 Relations clés

- un `user` peut appartenir à plusieurs `organizations`
- une `organization` possède plusieurs `brands`
- une `organization` possède plusieurs `projects`
- un `project` possède un ou plusieurs `briefs`
- un `project` déclenche plusieurs `jobs`
- un `job` possède plusieurs `job_steps`
- un `job` peut produire plusieurs `assets`
- un `job` peut produire un `qa_report`
- un `job` peut produire une `delivery`

---

## 6) Architecture des composants

### 6.1 Vue d’ensemble

```text
[Client Web]
    |
    v
[Next.js Dashboard]
    |
    | HTTPS + JWT session
    v
[Fastify API]
    |
    +-------------------------> [PostgreSQL]
    |                              | 
    |                              +--> users / orgs / briefs / jobs / assets / memory
    |
    +-------------------------> [Supabase Storage]
    |                              |
    |                              +--> images / audio / exports / previews
    |
    +-------------------------> [pg-boss queue in PostgreSQL]
                                   |
                                   v
                             [Worker / Orchestrator]
                                   |
             +---------------------+----------------------+
             |                     |                      |
             v                     v                      v
      [OpenAI LLM]          [fal.ai Images]       [ElevenLabs TTS]
             |                     |                      |
             +---------------------+----------------------+
                                   |
                                   v
                             [QA automatique]
                                   |
                                   v
                             [Delivery Builder]
                                   |
                                   +--> DB status update
                                   +--> assets en storage
                                   +--> livraison visible dans dashboard
```

---

### 6.2 Flux détaillé d’une demande client

#### Étape 1 — Soumission

Le client :

- se connecte
- choisit un agent
- remplit un brief
- ajoute éventuellement des fichiers

Le frontend envoie ces données à l’API.

#### Étape 2 — Normalisation

L’API :

- crée `project`
- crée `brief`
- stocke les pièces jointes
- crée un `job` en statut `queued`
- publie un message dans `pg-boss`

#### Étape 3 — Parsing du brief

Le worker :

- récupère le job
- appelle le LLM pour structurer le brief
- enrichit avec la mémoire client
- complète les paramètres manquants si possible

Sortie :

- `parsed_brief_json`
- éventuelles demandes de clarification si nécessaire plus tard

#### Étape 4 — Orchestration agent

Selon `agent_type`, le worker exécute un pipeline spécialisé.

##### Creative Studio

- analyse du brief
- génération de prompts visuels
- génération de plusieurs images
- sélection/scoring
- QA visuelle
- packaging des assets

##### Website Builder

- extraction objectifs / audience / CTA
- génération sitemap
- génération copy de sections
- génération maquette textuelle
- génération bundle ou export
- QA structurelle

##### Voiceover

- génération script
- validation de ton / longueur
- TTS
- contrôle durée / clarté
- livraison audio

##### Paid Media

- génération angles marketing
- ad copy variations
- structure de campagne
- recommandations créa / audiences / tests
- QA de cohérence

#### Étape 5 — QA automatique

Le système exécute des checks automatisés.

Exemples :

- conformité au brief
- présence CTA
- cohérence ton de marque
- détection de champs manquants
- contrôle de longueur script
- vérification nombre de livrables

Les résultats vont dans `qa_reports`.

#### Étape 6 — Livraison

Le système :

- stocke les fichiers finaux
- crée un objet `delivery`
- met le job en `completed`
- rend les résultats visibles dans le dashboard

#### Étape 7 — Historisation mémoire

Les éléments validés ou récurrents peuvent être injectés dans `client_memory_entries` :

- préférences créatives
- hooks performants
- ton validé
- disclaimers récurrents
- contraintes juridiques

---

## 7) Découpage applicatif des agents

Pour éviter que la logique devienne incontrôlable, chaque agent doit rester un pipeline métier autonome, branché sur un socle commun.

### 7.1 Socle commun

Modules mutualisés :

- `brief-parser`
- `memory-loader`
- `orchestrator`
- `qa-engine`
- `delivery-builder`
- `provider-clients`
- `usage-metering`

### 7.2 Agent Creative Studio

Entrées :

- brief marketing
- références visuelles
- identité de marque

Sorties :

- concepts visuels
- images finales
- variantes
- résumé de livraison

### 7.3 Agent Website Builder

Entrées :

- offre
- audience
- objectifs business
- style de marque

Sorties :

- arborescence
- copy
- structure de page
- bundle de livraison

### 7.4 Agent Voiceover

Entrées :

- message
- langue
- ton
- durée cible

Sorties :

- script
- version audio
- métadonnées durée/format

### 7.5 Agent Paid Media

Entrées :

- offre
- audience
- budget
- canaux
- objectif de campagne

Sorties :

- angles
- copies pub
- variantes tests
- recommandations opérationnelles

---

## 8) APIs à exposer en Phase 1

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/reset-password`

### Dashboard

- `GET /me`
- `GET /organizations/:id`
- `GET /projects`
- `GET /projects/:id`

### Briefs / Jobs

- `POST /projects`
- `POST /projects/:id/briefs`
- `POST /projects/:id/jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/steps`
- `POST /jobs/:id/retry`

### Assets / Delivery

- `GET /projects/:id/assets`
- `GET /deliveries/:id`
- `POST /assets/upload-url`

### Mémoire client

- `GET /brands/:id/memory`
- `POST /brands/:id/memory`

---

## 9) Plan de déploiement recommandé pour un solo entrepreneur

## Option recommandée : simple, peu chère, scalable

### Services

- **Vercel** : frontend `apps/web`
- **Railway** : `apps/api` et `apps/worker`
- **Supabase** :
  - Postgres
  - Auth
  - Storage

### Pourquoi cette combinaison

- peu de DevOps
- déploiement rapide
- logs accessibles
- coût contenu
- séparation claire UI / backend / data

---

### 9.1 Déploiement initial

#### Vercel

- connecte le repo
- déploie `apps/web`
- configure variables d’environnement

#### Railway

- déploie `apps/api`
- déploie `apps/worker`
- une instance worker au départ suffit

#### Supabase

- provisionne DB
- active Auth
- crée buckets Storage

---

### 9.2 Variables d’environnement à prévoir

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `FAL_KEY`
- `ELEVENLABS_API_KEY`
- `APP_URL`
- `JWT_SECRET` si nécessaire hors auth provider

---

### 9.3 Scalabilité progressive

#### Niveau 1 — lancement

- 1 frontend
- 1 API
- 1 worker
- DB managée

#### Niveau 2 — premiers clients actifs

- augmenter mémoire/CPU du worker
- ajouter concurrence job par type
- mettre limites d’usage par organisation

#### Niveau 3 — volume plus fort

- 2 à 3 workers
- séparation files par agent
- éventuelle migration de la queue vers Redis/BullMQ
- éventuel passage du storage vers R2

---

## 10) Recommandations d’implémentation pragmatiques

### 10.1 Commencer petit

Pour éviter de trop construire avant validation marché :

- démarrer avec **1 pipeline simple par agent**
- ne pas viser l’autonomie “totale” dès le départ
- conserver une possibilité de revue manuelle interne

### 10.2 Instrumentation minimale indispensable

Ajouter dès le départ :

- logs structurés
- suivi coût estimatif par job
- suivi durée de job
- statut fin de pipeline
- erreurs provider

### 10.3 QA pragmatique

La QA Phase 1 doit être surtout :

- textuelle
- structurelle
- orientée checklist

Pas besoin de système complexe d’évaluation multi-agents au départ.

### 10.4 Garde-fous coûts

Mettre en place très tôt :

- limite de jobs par organisation
- limite de variantes par brief
- plafond de coût par job
- arrêt automatique si dépassement

---

## 11) Risques principaux et parades

### Risque 1 — Coût IA non maîtrisé

**Parade**

- quotas par client
- journal `usage_events`
- modèles “mini” par défaut
- génération d’images par lot limité

### Risque 2 — Complexité orchestration

**Parade**

- pipelines linéaires simples au départ
- un worker unique
- pas de multi-agent conversationnel complexe en Phase 1

### Risque 3 — Temps de traitement long

**Parade**

- jobs async systématiques
- statut visible dans dashboard
- retries contrôlés

### Risque 4 — Dette technique précoce

**Parade**

- monorepo TypeScript
- modules partagés
- schémas Zod
- Prisma migrations propres

---

## 12) Recommandation finale

### Choix final recommandé

- **Frontend** : Next.js + TypeScript + Tailwind + shadcn/ui
- **Backend** : Fastify + TypeScript + Zod
- **DB** : PostgreSQL managé via Supabase
- **Auth** : Supabase Auth
- **Queue async** : pg-boss sur PostgreSQL
- **Worker** : service Node.js séparé
- **Storage** : Supabase Storage
- **Déploiement** : Vercel + Railway + Supabase
- **LLM texte** : OpenAI GPT-5.4-mini
- **Images** : fal.ai
- **Voix/TTS** : ElevenLabs
- **Repo** : monorepo

### Pourquoi cette architecture est la meilleure pour Remy

Parce qu’elle est :

- **simple à lancer**
- **économique**
- **cohérente pour un solo entrepreneur**
- **suffisamment scalable** pour les premiers clients
- **modulaire** pour ajouter plus tard d’autres agents ou providers

En résumé : ne pas viser une architecture “startup série B” dès le jour 1. Il faut une architecture **sobre, robuste, lisible et peu coûteuse**, capable de valider rapidement le produit et les usages clients.