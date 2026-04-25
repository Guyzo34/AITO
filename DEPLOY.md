# Guide de deploiement — Agents Marketing Phase 1

Stack cible : **Vercel** (frontend) · **Railway** (API + Worker) · **Supabase** (DB + Auth + Storage)

---

## Table des matieres

1. [Prerequis](#1-prerequis)
2. [Supabase — DB, Auth, Storage](#2-supabase--db-auth-storage)
3. [Railway — API](#3-railway--api)
4. [Railway — Worker](#4-railway--worker)
5. [Vercel — Frontend](#5-vercel--frontend)
6. [Variables d'environnement par service](#6-variables-denvironnement-par-service)
7. [Migrations Prisma](#7-migrations-prisma)
8. [Verification post-deploiement](#8-verification-post-deploiement)
9. [URLs attendues](#9-urls-attendues)
10. [Commandes utiles](#10-commandes-utiles)

---

## 1. Prerequis

### Comptes necessaires
- [Supabase](https://supabase.com) — free tier suffisant pour demarrer
- [Railway](https://railway.app) — plan Hobby ($5/mois) recommande pour la production
- [Vercel](https://vercel.com) — free tier suffisant

### Outils locaux
```bash
node --version   # >= 20
npm --version    # >= 10
npx prisma --version  # >= 6
```

### Repo
Le projet doit etre versionne dans un repo Git (GitHub, GitLab ou Bitbucket) pour connecter les deploiements automatiques.

---

## 2. Supabase — DB, Auth, Storage

### 2.1 Creer le projet Supabase

1. [app.supabase.com](https://app.supabase.com) > **New project**
2. Choisir une region proche de vos utilisateurs (ex. `eu-west-3` Paris)
3. Definir un mot de passe base de donnees fort — conserver-le, il sera utilise dans `DATABASE_URL`

### 2.2 Recuperer les credentials

Dans **Settings > API** :
- `SUPABASE_URL` = Project URL
- `SUPABASE_ANON_KEY` = anon / public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (secret — ne jamais exposer cote client)

Dans **Settings > Database** :
- **Connection string (pooler, Transaction mode)** → `DATABASE_URL`  
  Format : `postgresql://postgres.xxxx:[PWD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true`
- **Connection string (direct)** → `DIRECT_URL`  
  Format : `postgresql://postgres.xxxx:[PWD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`

> `DATABASE_URL` utilise le pooler PgBouncer (port 6543) — obligatoire pour Prisma en prod.  
> `DIRECT_URL` est la connexion directe (port 5432) — utilisee uniquement pour les migrations.

### 2.3 Appliquer les migrations Prisma

Depuis la racine du monorepo (avec `DIRECT_URL` configure dans `.env`) :

```bash
# Generer le client Prisma (binaires natifs Windows pour dev local)
npm run db:generate

# Appliquer toutes les migrations
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

Cela cree toutes les tables dans votre base Supabase.

> **Note** : pg-boss cree automatiquement son schema `pgboss` au premier demarrage du Worker.

### 2.4 Configurer Supabase Auth

Dans **Authentication > Providers** :
- Email/Password : activer

Dans **Authentication > URL Configuration** :
- Site URL : `https://votre-app.vercel.app` (a mettre a jour apres deploiement Vercel)
- Redirect URLs : `https://votre-app.vercel.app/**`

### 2.5 Creer les buckets Storage

Dans **Storage** > **New bucket**, creer les 3 buckets suivants :

| Nom du bucket | Acces | Usage |
|---|---|---|
| `generated-assets` | Private | Images generees par Creative Studio et Paid Media |
| `voiceovers` | Private | Fichiers audio ElevenLabs |
| `paid-media-documents` | Private | Documents de campagne Paid Media |

> Les variables `SUPABASE_STORAGE_BUCKET` et `SUPABASE_ASSETS_BUCKET` dans `.env` referent au bucket principal. Adapter selon votre configuration.

---

## 3. Railway — API

### 3.1 Creer le service

1. [railway.app](https://railway.app) > **New Project** > **Deploy from GitHub repo**
2. Choisir le repo `agents-marketing`
3. Railway detecte le `Dockerfile.api` a la racine → **confirmer**

> Si Railway ne detecte pas automatiquement le Dockerfile, dans les settings du service :  
> **Build** > **Dockerfile Path** = `Dockerfile.api`

### 3.2 Configurer les variables d'environnement

Dans **Variables** du service API, ajouter :

```
DATABASE_URL=postgresql://postgres.xxxx:[PWD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[PWD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_URL=https://votre-app.vercel.app
API_PORT=4000
JWT_SECRET=<generer-une-valeur-aleatoire-32-chars>
PG_BOSS_SCHEMA=pgboss
PG_BOSS_JOB_NAME=project-job
OPENAI_API_KEY=sk-...
FAL_KEY=...
ELEVENLABS_API_KEY=...
NODE_ENV=production
```

### 3.3 Configurer le port

Dans **Settings** > **Networking** :
- Port expose = `4000`
- Activer **Public Networking** pour obtenir une URL publique (`https://api-xxxx.railway.app`)

### 3.4 Health check

Le service API expose `/health` → Railway verifie automatiquement via `railway.json`.

---

## 4. Railway — Worker

### 4.1 Creer le service

Dans le meme **Railway Project** :
1. **Add Service** > **Deploy from GitHub repo** (meme repo)
2. Dans les settings du service :  
   **Build** > **Dockerfile Path** = `Dockerfile.worker`

### 4.2 Configurer les variables d'environnement

```
DATABASE_URL=postgresql://postgres.xxxx:[PWD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_URL=https://votre-app.vercel.app
OPENAI_API_KEY=sk-...
FAL_KEY=...
ELEVENLABS_API_KEY=...
PAID_MEDIA_ENABLE_MOCKUPS=false
FAL_PAID_MEDIA_MODEL_URL=https://fal.run/fal-ai/flux/schnell
PG_BOSS_SCHEMA=pgboss
PG_BOSS_JOB_NAME=project-job
NODE_ENV=production
```

> Le Worker n'expose pas de port HTTP — pas besoin de networking public.

---

## 5. Vercel — Frontend

### 5.1 Importer le projet

1. [vercel.com](https://vercel.com) > **Add New... > Project**
2. Connecter le repo GitHub
3. Dans la configuration du projet :
   - **Framework Preset** : Next.js (auto-detecte)
   - **Root Directory** : `apps/web`
   - **Build Command** : `next build` (defaut)
   - **Output Directory** : `.next` (defaut)
   - **Install Command** : `npm install` (depuis la racine du monorepo)

> Vercel installe automatiquement les workspace packages depuis la racine quand un `Root Directory` est specifie dans un repo npm workspaces.

### 5.2 Variables d'environnement

Dans **Settings > Environment Variables** :

```
NEXT_PUBLIC_API_URL=https://api-xxxx.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> Utiliser l'URL publique Railway de votre service API pour `NEXT_PUBLIC_API_URL`.

### 5.3 Deployer

Cliquer **Deploy**. Vercel construit et deploie le frontend Next.js.

### 5.4 Mettre a jour les URLs Supabase

Apres avoir obtenu l'URL Vercel (ex. `https://agents-marketing.vercel.app`) :
- Supabase > **Authentication > URL Configuration** > mettre a jour `Site URL` et `Redirect URLs`
- Railway API > Variables > mettre a jour `APP_URL`

---

## 6. Variables d'environnement par service

| Variable | Vercel | Railway API | Railway Worker | Description |
|---|:---:|:---:|:---:|---|
| `DATABASE_URL` | — | ✓ | ✓ | Connexion pooler Supabase |
| `DIRECT_URL` | — | ✓ | — | Connexion directe (migrations uniquement) |
| `SUPABASE_URL` | — | ✓ | ✓ | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | — | ✓ | ✓ | Cle publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✓ | ✓ | Cle privee Supabase (secret) |
| `NEXT_PUBLIC_API_URL` | ✓ | — | — | URL publique de l'API Railway |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | — | — | URL Supabase (client browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | — | — | Cle anon Supabase (client browser) |
| `OPENAI_API_KEY` | — | ✓ | ✓ | Cle OpenAI |
| `FAL_KEY` | — | — | ✓ | Cle fal.ai (generation images) |
| `ELEVENLABS_API_KEY` | — | — | ✓ | Cle ElevenLabs (voiceover) |
| `APP_URL` | — | ✓ | ✓ | URL Vercel du frontend |
| `API_PORT` | — | ✓ | — | Port ecoute API (defaut : 4000) |
| `JWT_SECRET` | — | ✓ | — | Secret JWT (optionnel si Supabase Auth seul) |
| `PG_BOSS_SCHEMA` | — | ✓ | ✓ | Schema pg-boss (defaut : pgboss) |
| `PG_BOSS_JOB_NAME` | — | ✓ | ✓ | Nom du job pg-boss (defaut : project-job) |
| `PAID_MEDIA_ENABLE_MOCKUPS` | — | — | ✓ | Activer les mockups (false en prod) |
| `FAL_PAID_MEDIA_MODEL_URL` | — | — | ✓ | URL modele fal.ai pour Paid Media |
| `NODE_ENV` | auto | ✓ | ✓ | `production` |

---

## 7. Migrations Prisma

### Application initiale (depuis votre machine)

```bash
# Configurer DIRECT_URL dans .env (connexion directe, pas pooler)
cp .env.example .env
# Editer .env avec vos vraies valeurs Supabase

# Appliquer toutes les migrations
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

### Nouvelles migrations

```bash
# 1. Modifier packages/db/prisma/schema.prisma
# 2. Creer la migration
npx prisma migrate dev --schema packages/db/prisma/schema.prisma --name nom_de_la_migration

# 3. Appliquer en production
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

### Client Prisma (regenerer apres modification du schema)

```bash
npm run db:generate
```

> En production, les Dockerfiles regenerent automatiquement le client Prisma pour Linux lors du build (`npx prisma generate`).

---

## 8. Verification post-deploiement

### API Railway
```bash
curl https://api-xxxx.railway.app/health
# Reponse attendue : {"status":"ok"}
```

### Frontend Vercel
- Ouvrir `https://votre-app.vercel.app`
- La page de connexion doit s'afficher

### Worker Railway
- Dans les logs Railway Worker, verifier :
  ```
  Worker pg-boss demarre
  ```

### Base de donnees Supabase
- Dans Supabase > **Table Editor**, verifier que les tables existent :
  `users`, `organizations`, `projects`, `briefs`, `jobs`, `assets`, etc.
- Dans le schema `pgboss`, verifier que pg-boss a cree ses tables de queue

---

## 9. URLs attendues

| Service | URL |
|---|---|
| Frontend (Vercel) | `https://votre-app.vercel.app` |
| API (Railway) | `https://api-xxxx.railway.app` |
| API Health | `https://api-xxxx.railway.app/health` |
| Supabase Dashboard | `https://app.supabase.com/project/xxxx` |
| Railway Dashboard | `https://railway.app/project/xxxx` |

---

## 10. Commandes utiles

### Dev local (tout en parallele)
```bash
cp .env.example .env  # puis remplir les valeurs
npm run dev
```

### Dev API seulement
```bash
npm run api:dev
```

### Dev Worker seulement
```bash
npm run worker:dev
```

### Build de production (verification locale)
```bash
npm run build
```

### Typecheck complet
```bash
npm run typecheck
```

### Build Docker local (test avant Railway)
```bash
# API
docker build -f Dockerfile.api -t agents-marketing-api .
docker run -p 4000:4000 --env-file .env agents-marketing-api

# Worker
docker build -f Dockerfile.worker -t agents-marketing-worker .
docker run --env-file .env agents-marketing-worker
```

### Migrations Prisma
```bash
# Appliquer en production
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

# Regenerer le client
npm run db:generate

# Inspecter la DB (Prisma Studio)
npx prisma studio --schema packages/db/prisma/schema.prisma
```

---

## Notes importantes

- **Prisma + Railway** : les Dockerfiles executent `prisma generate` pendant le build pour generer les binaires Linux corrects. Le repertoire `packages/db/generated/` est dans `.gitignore`.

- **pg-boss** : le Worker cree automatiquement le schema `pgboss` dans la base de donnees au premier demarrage. Aucune migration manuelle necessaire.

- **Secrets** : ne jamais commiter `.env`. Utiliser les variables d'environnement des plateformes (Vercel Settings, Railway Variables).

- **CORS** : l'API Fastify accepte toutes les origines en prod (`origin: true`). Restreindre a `NEXT_PUBLIC_API_URL` en durcissant la configuration pour un usage en production etendue.

- **Supabase pooler** : utiliser le mode **Transaction** (port 6543) pour `DATABASE_URL` en production avec Prisma, pas le mode Session.
