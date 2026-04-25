/* Données statiques des actualités AIMH pour la Phase 1 */

export type Actualite = {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
  categorie: "evenement" | "annonce" | "culture" | "solidarite";
  date: string; /* ISO 8601 */
  image?: string;
  auteur: string;
};

/* Libellés des catégories */
export const CATEGORIES: Record<Actualite["categorie"], string> = {
  evenement:  "Événement",
  annonce:    "Annonce",
  culture:    "Culture",
  solidarite: "Solidarité"
};

/* Couleurs des catégories */
export const CATEGORIE_COLORS: Record<
  Actualite["categorie"],
  { bg: string; text: string }
> = {
  evenement:  { bg: "bg-orange-100", text: "text-orange-700" },
  annonce:    { bg: "bg-blue-100",   text: "text-blue-700" },
  culture:    { bg: "bg-purple-100", text: "text-purple-700" },
  solidarite: { bg: "bg-green-100",  text: "text-green-700" }
};

/* Liste des actualités */
export const ACTUALITES: Actualite[] = [
  {
    id: "1",
    slug: "journee-culturelle-aimh-2025",
    titre: "Journée culturelle de l'AIMH — édition 2025",
    resume:
      "Grande célébration de la culture ivoirienne à Montpellier : danses, musique, gastronomie et expositions artisanales réunissent la communauté.",
    contenu: `L'AIMH est fière de vous annoncer la tenue de sa Journée Culturelle Annuelle le samedi 15 mars 2025 à la Maison pour Tous de Montpellier.

Au programme de cette journée festive et conviviale :

**Matin (10h – 13h)**
- Exposition artisanale : bijoux, tissus et objets d'art ivoiriens
- Atelier cuisine : initiation à la préparation du foutou et de l'attiéké
- Conférence : "La diaspora ivoirienne en France : enjeux et perspectives"

**Après-midi (15h – 20h)**
- Spectacle de danses traditionnelles par le groupe Adjoua
- Concert de musique live : afrobeats, coupé-décalé et zouglou
- Restauration : buffet 100 % ivoirien préparé par les membres

L'entrée est libre et gratuite. Venez nombreux avec vos familles et amis !

Pour plus d'informations, contactez-nous à contact@aimh.fr ou au 06 00 00 00 00.`,
    categorie: "evenement",
    date: "2025-02-15",
    auteur: "Secrétariat AIMH"
  },
  {
    id: "2",
    slug: "aide-scolarite-2025",
    titre: "Programme d'aide à la scolarité 2025",
    resume:
      "L'AIMH lance son programme annuel d'aide à la scolarité pour les enfants des familles membres en situation de difficulté.",
    contenu: `Dans le cadre de sa mission de solidarité, l'AIMH ouvre les candidatures pour son Programme d'Aide à la Scolarité 2025.

**À qui s'adresse ce programme ?**
Ce programme est destiné aux enfants des familles membres de l'AIMH qui rencontrent des difficultés financières pour couvrir les frais de scolarité (fournitures, sorties scolaires, activités périscolaires).

**Montants attribués**
- Primaire : jusqu'à 100 € par enfant
- Collège : jusqu'à 150 € par enfant
- Lycée : jusqu'à 200 € par enfant

**Comment candidater ?**
1. Être membre à jour de cotisation de l'AIMH
2. Remplir le formulaire disponible au secrétariat ou sur notre site
3. Joindre les justificatifs demandés (certificat de scolarité, justificatif de revenus)
4. Déposer le dossier avant le 28 février 2025

Pour obtenir le formulaire, contactez-nous par email à contact@aimh.fr.`,
    categorie: "solidarite",
    date: "2025-01-20",
    auteur: "Commission Solidarité"
  },
  {
    id: "3",
    slug: "assemblee-generale-2025",
    titre: "Assemblée Générale ordinaire 2025",
    resume:
      "Convocation à l'Assemblée Générale Ordinaire de l'AIMH pour présenter le bilan 2024 et élire le nouveau bureau.",
    contenu: `Le Conseil d'Administration de l'AIMH a l'honneur de convoquer tous ses membres à l'Assemblée Générale Ordinaire qui se tiendra :

**Date et lieu**
Samedi 8 février 2025 à 14h00
Salle Polyvalente du Quartier Croix-d'Argent
Montpellier (34070)

**Ordre du jour**
1. Rapport moral du Président
2. Rapport financier du Trésorier — exercice 2024
3. Questions diverses des membres
4. Élection du nouveau Conseil d'Administration

**Conditions de participation**
Seuls les membres à jour de cotisation pour l'année 2024 ou 2025 ont droit de vote. Les membres peuvent se faire représenter par procuration (formulaire à retirer au secrétariat).

Nous comptons sur votre présence pour faire vivre notre association. Un pot de l'amitié sera organisé à l'issue de l'assemblée.`,
    categorie: "annonce",
    date: "2025-01-10",
    auteur: "Président AIMH"
  },
  {
    id: "4",
    slug: "fete-independance-cote-divoire-2024",
    titre: "Fête de l'indépendance : la communauté se retrouve",
    resume:
      "Le 7 août, jour de l'indépendance de la Côte d'Ivoire, l'AIMH a organisé un rassemblement festif en plein air à Montpellier.",
    contenu: `Le 7 août 2024, l'AIMH a célébré avec fierté le 64e anniversaire de l'indépendance de la Côte d'Ivoire lors d'un rassemblement en plein air au Parc de la Guirlande, à Montpellier.

Près de 200 personnes — membres, familles, amis et sympathisants — ont répondu présents pour cette belle fête nationale.

**Points forts de la célébration**
- Cérémonie du lever des drapeaux
- Discours du Président de l'AIMH et allocution du consul honoraire
- Spectacle artistique : chants et danses du terroir ivoirien
- Défilé de tenues traditionnelles des différentes régions
- Grand repas communautaire partagé

Cette journée fut une magnifique occasion de renforcer les liens au sein de la diaspora et de transmettre à nos enfants nés en France la richesse de notre culture.

*"L'union fait la force"* — merci à tous les bénévoles et membres qui ont contribué à l'organisation.`,
    categorie: "culture",
    date: "2024-08-10",
    auteur: "Comité des fêtes AIMH"
  },
  {
    id: "5",
    slug: "permanence-administrative-montpellier",
    titre: "Nouvelle permanence administrative chaque jeudi",
    resume:
      "L'AIMH ouvre une permanence administrative hebdomadaire pour accompagner les membres dans leurs démarches administratives.",
    contenu: `Afin de mieux servir ses membres, l'AIMH met en place une permanence administrative chaque jeudi de 18h à 20h.

**Service proposé**
Notre équipe bénévole vous accompagne dans vos démarches :
- Aide à la rédaction de courriers administratifs
- Orientation vers les services sociaux compétents
- Conseil pour les démarches liées au titre de séjour
- Aide à la recherche de logement et d'emploi
- Orientation scolaire et universitaire

**Lieu**
Maison de Quartier des Beaux-Arts
123 rue des Beaux-Arts, Montpellier 34000

**Accès**
Bus ligne 7 — arrêt "Beaux-Arts"
Tramway ligne 2 — arrêt "Sabines" (10 min à pied)

Ce service est gratuit et ouvert à tous les membres. N'hésitez pas à vous présenter ou à prendre rendez-vous par email à contact@aimh.fr.`,
    categorie: "annonce",
    date: "2024-09-05",
    auteur: "Commission Intégration"
  }
];

/* Récupérer une actualité par slug */
export function getActualiteBySlug(slug: string): Actualite | undefined {
  return ACTUALITES.find((a) => a.slug === slug);
}

/* Récupérer les actualités récentes (n dernières) */
export function getActualitesRecentes(n = 3): Actualite[] {
  return [...ACTUALITES]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, n);
}
