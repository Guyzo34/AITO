# Guide de deploiement — AIMH Phase 1

Plateforme : **Vercel** (frontend Next.js) + **Supabase** (Auth + Base de donnees)

---

## Table des matieres

1. [Prerequis](#1-prerequis)
2. [Creer le projet Supabase](#2-creer-le-projet-supabase)
3. [Configurer l'authentification Supabase](#3-configurer-lauthentification-supabase)
4. [Mettre en place la base de donnees](#4-mettre-en-place-la-base-de-donnees)
5. [Deployer sur Vercel](#5-deployer-sur-vercel)
6. [Configurer les variables d'environnement](#6-configurer-les-variables-denvironnement)
7. [Mettre a jour les URLs Supabase](#7-mettre-a-jour-les-urls-supabase)
8. [Verification post-deploiement](#8-verification-post-deploiement)
9. [Dev local](#9-dev-local)

---

## 1. Prerequis

### Comptes necessaires
- [Supabase](https://supabase.com) — free tier suffisant
- [Vercel](https://vercel.com) — free tier suffisant
- Un repo Git (GitHub, GitLab, Bitbucket) contenant ce projet

### Outils locaux
```bash
node --version   # >= 20
npm --version    # >= 10
```

### Structure du projet
Ce projet est un monorepo npm workspaces. Le frontend Next.js est dans `apps/web`.

---

## 2. Creer le projet Supabase

### 2.1 Nouveau projet

1. Ouvrir [app.supabase.com](https://app.supabase.com)
2. Cliquer **New project**
3. Choisir un nom : `aimh-phase1` (ou similaire)
4. Choisir une region proche de vos utilisateurs : `eu-west-3` (Paris) recommande
5. Definir un mot de passe base de donnees fort — le conserver precieusement
6. Cliquer **Create new project** — attendre ~2 minutes

### 2.2 Recuperer les credentials

Dans **Settings > API** :

| Variable | Ou la trouver | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | URL de votre projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public | Cle publique (safe cote client) |

> La `service_role` key est confidentielle — ne jamais l'utiliser cote client.

---

## 3. Configurer l'authentification Supabase

### 3.1 Activer Email/Password et Magic Link

Dans **Authentication > Providers** :
- **Email** : activer (active par defaut)
- Magic Link fonctionne via `signInWithOtp` — aucune configuration supplementaire requise

### 3.2 Configuration des URLs de redirection (a faire APRES deploiement Vercel)

Dans **Authentication > URL Configuration** :

```
Site URL:     https://votre-app.vercel.app
Redirect URLs:
  https://votre-app.vercel.app/**
  http://localhost:3000/**
```

> Les redirect URLs autorisent les liens de confirmation/magic link.
> Ajouter `http://localhost:3000/**` pour le developpement local.

### 3.3 Configurer les emails (optionnel)

Dans **Authentication > Email Templates** :
- Personnaliser les emails de confirmation, magic link, et reset password si souhaite

---

## 4. Mettre en place la base de donnees

### 4.1 Executer le schema SQL

1. Dans le dashboard Supabase, aller dans **SQL Editor**
2. Cliquer **New query**
3. Copier-coller le contenu de `supabase/schema.sql`
4. Cliquer **Run** (ou Ctrl+Enter)

Le schema cree :
- La table `profiles` avec les colonnes : `id`, `email`, `nom`, `prenom`, `telephone`, `ville`, `bio`, `avatar_url`, `date_adhesion`
- Les politiques RLS (Row Level Security) : chaque membre ne peut voir/modifier que son propre profil
- Un trigger `on_auth_user_created` qui cree automatiquement le profil lors de l'inscription

### 4.2 Verifier la creation

Dans **Table Editor**, verifier que la table `profiles` existe avec les bonnes colonnes.

Dans **Authentication > Policies**, verifier que 3 policies sont presentes sur `profiles` :
- `profiles_select_own`
- `profiles_update_own`
- `profiles_insert_own`

---

## 5. Deployer sur Vercel

### 5.1 Importer le projet

1. Aller sur [vercel.com](https://vercel.com) > **Add New... > Project**
2. Connecter le repo Git contenant ce projet
3. Dans la configuration du projet :

| Parametre | Valeur |
|---|---|
| **Framework Preset** | Next.js (auto-detecte) |
| **Root Directory** | `apps/web` |
| **Build Command** | `next build` (defaut) |
| **Output Directory** | `.next` (defaut) |
| **Install Command** | `npm install` (defaut) |

> Vercel detecte automatiquement le monorepo npm workspaces et installe les packages depuis la racine.

### 5.2 Ajouter les variables d'environnement AVANT de deployer

Dans **Settings > Environment Variables**, ajouter (voir section 6) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

### 5.3 Lancer le deploiement

Cliquer **Deploy**. Vercel construit et deploie le frontend (environ 2-3 minutes).

Une fois deploye, noter l'URL : `https://votre-app.vercel.app`

---

## 6. Configurer les variables d'environnement

### Variables requises

| Variable | Description | Exemple |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://abcdef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle publique Supabase (anon) | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_SITE_URL` | URL du site deploye | `https://votre-app.vercel.app` |

### Sur Vercel

Dans **Settings > Environment Variables** du projet Vercel :
1. Ajouter chaque variable avec sa valeur
2. Selectionner les environnements : Production, Preview, Development
3. Cliquer **Save**
4. Redeclencher un deploiement si necessaire : **Deployments > ... > Redeploy**

### En local (dev)

Copier `.env.local.example` en `.env.local` :
```bash
cd apps/web
copy .env.local.example .env.local
# Editer .env.local avec vos vraies valeurs
```

Contenu de `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `.env.local` est dans `.gitignore` — ne jamais le commiter.

---

## 7. Mettre a jour les URLs Supabase

Apres avoir obtenu l'URL Vercel (ex. `https://aimh.vercel.app`) :

Dans **Supabase > Authentication > URL Configuration** :
```
Site URL:     https://aimh.vercel.app
Redirect URLs:
  https://aimh.vercel.app/**
  http://localhost:3000/**
```

> Sans cette configuration, les magic links et les emails de confirmation renverront vers une mauvaise URL.

---

## 8. Verification post-deploiement

### Checklist

- [ ] `https://votre-app.vercel.app` affiche la page d'accueil AIMH
- [ ] `https://votre-app.vercel.app/connexion` affiche le formulaire de connexion
- [ ] `https://votre-app.vercel.app/inscription` affiche le formulaire d'inscription
- [ ] L'inscription avec un email reel envoie un email de confirmation
- [ ] Le lien de confirmation redirige vers `/auth/callback` puis `/tableau-de-bord`
- [ ] La connexion avec email/mot de passe fonctionne
- [ ] Le magic link fonctionne (connexion sans mot de passe)
- [ ] La deconnexion fonctionne
- [ ] Dans Supabase > Table Editor > profiles, un profil est cree apres inscription

### Tests rapides

```bash
# Verifier que le site repond
curl -I https://votre-app.vercel.app
# Reponse attendue : HTTP/2 200

# Verifier la page de connexion
curl -I https://votre-app.vercel.app/connexion
# Reponse attendue : HTTP/2 200
```

### Logs Vercel

En cas d'erreur, consulter **Vercel > Deployments > votre-deploy > Logs** pour diagnostiquer.

---

## 9. Dev local

### Demarrage

```bash
# Depuis la racine du monorepo
npm install

# Demarrer uniquement le frontend
cd apps/web
npm run dev
# Ou depuis la racine :
npm run dev -w @agents-marketing/web
```

Le frontend est disponible sur `http://localhost:3000`.

### Build local (verification avant deploiement)

```bash
cd apps/web
npm run build
# Verifie que le build de production fonctionne sans erreur
```

### Typecheck

```bash
cd apps/web
npm run typecheck
```

---

## Fichiers cles

| Fichier | Role |
|---|---|
| `apps/web/.env.local` | Variables d'environnement locales (non commite) |
| `apps/web/.env.local.example` | Template des variables d'environnement |
| `apps/web/vercel.json` | Configuration Vercel |
| `apps/web/next.config.ts` | Configuration Next.js |
| `apps/web/supabase/schema.sql` | Schema SQL a executer dans Supabase |
| `apps/web/lib/supabase.ts` | Client Supabase |
| `apps/web/lib/env.ts` | Validation des variables d'environnement |

---

## Notes importantes

- **Securite** : ne jamais commiter `.env.local` ni exposer la `service_role` key Supabase.
- **RLS** : toutes les tables Supabase ont Row Level Security active — chaque membre ne peut acceder qu'a ses propres donnees.
- **Magic Link** : necessite que l'email de confirmation soit configure dans Supabase (actif par defaut).
- **Monorepo** : Vercel installe les workspace packages depuis la racine automatiquement quand `Root Directory` est configure.
