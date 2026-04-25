"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Liens de navigation publique */
const NAV_LINKS = [
  { href: "/",           label: "Accueil" },
  { href: "/a-propos",   label: "À propos" },
  { href: "/actualites", label: "Actualités" },
  { href: "/contact",    label: "Contact" }
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
      {/* Bandeau tricolore fin en haut */}
      <div className="flag-stripe h-1 w-full" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 font-display text-xl font-semibold text-foreground"
          onClick={() => setMenuOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Users className="size-5" />
          </span>
          <span>
            <span className="text-primary">AIMH</span>
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Button asChild size="sm">
                  <Link href="/tableau-de-bord">Mon espace</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/connexion">Connexion</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/inscription">Rejoindre</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Bouton menu mobile */}
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="border-t border-border bg-card px-4 pb-6 pt-4 md:hidden">
          <nav className="mb-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Button asChild onClick={() => setMenuOpen(false)}>
                    <Link href="/tableau-de-bord">Mon espace membre</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                      <Link href="/connexion">Connexion</Link>
                    </Button>
                    <Button asChild onClick={() => setMenuOpen(false)}>
                      <Link href="/inscription">Rejoindre l'AIMH</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
