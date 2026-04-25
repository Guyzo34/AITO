import type { Metadata } from "next";
import Link from "next/link";
import { Users, Target, Heart, MapPin, Mail, Phone, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Découvrez l'histoire, les missions et le bureau de l'AIMH — Amicale des Ivoiriens de Montpellier et Hérault."
};

/* Membres du bureau */
const BUREAU = [
  { prenom: "Kofi", nom: "Adu", role: "Président" },
  { prenom: "Aya",  nom: "Koné", role: "Vice-présidente" },
  { prenom: "Brice",nom: "Yao",  role: "Secrétaire général" },
  { prenom: "Fatou",nom: "Dosso",role: "Trésorière" },
  { prenom: "Eric", nom: "Gnato",role: "Responsable culturel" },
  { prenom: "Carine",nom: "Aka", role: "Responsable solidarité" }
];

/* Missions de l'association */
const MISSIONS = [
  {
    icon: Users,
    titre: "Rassemblement",
    texte:
      "Fédérer les Ivoiriens et amis de la Côte d'Ivoire résidant à Montpellier et dans l'Hérault autour d'un projet communautaire commun."
  },
  {
    icon: Heart,
    titre: "Solidarité",
    texte:
      "Apporter un soutien moral, matériel et administratif aux membres en difficulté, notamment lors de situations de précarité ou de deuil."
  },
  {
    icon: Target,
    titre: "Intégration",
    texte:
      "Faciliter l'insertion sociale et professionnelle des nouveaux arrivants en les orientant vers les ressources disponibles."
  },
  {
    icon: Award,
    titre: "Promotion culturelle",
    texte:
      "Valoriser et transmettre la culture ivoirienne à travers des événements, ateliers et manifestations ouvertes à tous."
  }
];

export default function AProposPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="bg-muted px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
            <Users className="size-4 text-primary" />
            Notre histoire
          </span>
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
            À propos de l'AIMH
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Depuis notre création, l'AIMH œuvre pour l'épanouissement et l'intégration des Ivoiriens
            de Montpellier et du département de l'Hérault.
          </p>
        </div>
      </div>

      {/* Historique */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Notre histoire</h2>
          <div className="prose prose-stone max-w-none text-muted-foreground leading-8">
            <p>
              L'Amicale des Ivoiriens de Montpellier et Hérault (AIMH) a été fondée par un groupe
              de Ivoiriens passionnés par l'idée de créer un cadre de vie associatif fort pour
              leur communauté au cœur du Languedoc.
            </p>
            <p className="mt-4">
              Face à l'éloignement de la terre natale, il est apparu indispensable de créer un espace
              d'accueil, d'entraide et de partage. L'AIMH est ainsi née de la volonté de ces hommes et
              femmes de ne pas perdre le lien avec leurs racines tout en s'intégrant pleinement à la
              vie montpelliéraine.
            </p>
            <p className="mt-4">
              Au fil des années, l'association a grandi, s'est structurée et a étendu son action :
              des fêtes culturelles aux permanences administratives, de l'aide à la scolarité aux
              soirées de gala, l'AIMH est aujourd'hui un acteur incontournable de la vie associative
              ivoirienne dans le Sud de la France.
            </p>
          </div>
        </div>
      </section>

      {/* Missions */}
      <section className="bg-muted px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 font-display text-2xl font-bold text-foreground text-center">Nos missions</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Quatre axes guident notre engagement au quotidien
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {MISSIONS.map((m) => (
              <Card key={m.titre}>
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <m.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{m.titre}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">{m.texte}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bureau */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 font-display text-2xl font-bold text-foreground text-center">Le bureau</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Les bénévoles qui pilotent l'association
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUREAU.map((membre) => {
              const initials = `${membre.prenom.charAt(0)}${membre.nom.charAt(0)}`;
              return (
                <Card key={`${membre.prenom}-${membre.nom}`}>
                  <CardContent className="flex items-center gap-4 py-5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {initials}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {membre.prenom} {membre.nom}
                      </p>
                      <p className="text-sm text-muted-foreground">{membre.role}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact rapide */}
      <section className="border-t border-border bg-muted px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Nous contacter</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Montpellier, Hérault (34)
            </div>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <a href="mailto:contact@aimh.fr" className="hover:text-primary transition">
                contact@aimh.fr
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              <a href="tel:+33600000000" className="hover:text-primary transition">
                +33 6 00 00 00 00
              </a>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild>
              <Link href="/contact">Formulaire de contact</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inscription">Devenir membre</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
