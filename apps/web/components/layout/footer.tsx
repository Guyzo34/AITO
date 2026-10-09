import Link from "next/link";
import { Users, Mail, MapPin, Phone, Share2, Heart, Globe } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-foreground text-background">
      {/* Bandeau tricolore */}
      <div className="flag-stripe h-1 w-full" />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Identité */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="size-5" />
              </span>
              <span className="font-display text-xl font-semibold text-primary">AITO</span>
            </div>
            <p className="text-sm leading-7 opacity-70">
              Association des Ivoiriens de Toulouse et de l'Occitanie — solidarité, culture et entraide depuis notre création.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest opacity-50">Navigation</h3>
            <ul className="space-y-3">
              {[
                { href: "/",           label: "Accueil" },
                { href: "/a-propos",   label: "À propos" },
                { href: "/actualites", label: "Actualités" },
                { href: "/contact",    label: "Contact" }
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm opacity-70 transition hover:opacity-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Espace membre */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest opacity-50">Espace membre</h3>
            <ul className="space-y-3">
              {[
                { href: "/inscription",        label: "Rejoindre l'AITO" },
                { href: "/connexion",          label: "Se connecter" },
                { href: "/tableau-de-bord",    label: "Mon tableau de bord" }
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm opacity-70 transition hover:opacity-100">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest opacity-50">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm opacity-70">
                <MapPin className="size-4 shrink-0" />
                Toulouse, Haute-Garonne (34)
              </li>
              <li className="flex items-center gap-2 text-sm opacity-70">
                <Mail className="size-4 shrink-0" />
                <a href="mailto:contact@aito-occitanie.fr" className="hover:opacity-100 transition">
                  contact@aito-occitanie.fr
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm opacity-70">
                <Phone className="size-4 shrink-0" />
                <a href="tel:+33600000000" className="hover:opacity-100 transition">
                  +33 6 00 00 00 00
                </a>
              </li>
            </ul>
            {/* Réseaux sociaux */}
            <div className="mt-5 flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 p-2 opacity-60 transition hover:opacity-100"
                aria-label="Facebook"
              >
                <Globe className="size-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 p-2 opacity-60 transition hover:opacity-100"
                aria-label="Instagram"
              >
                <Heart className="size-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 p-2 opacity-60 transition hover:opacity-100"
                aria-label="YouTube"
              >
                <Share2 className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bas de page */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs opacity-50">
          <p>© {year} AITO — Association des Ivoiriens de Toulouse et de l'Occitanie. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
