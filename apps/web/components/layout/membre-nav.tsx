"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  Users,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Liens de navigation membre */
const MEMBRE_NAV = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/profil",           label: "Mon profil",       icon: User }
];

export function MembreNav(props: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Rediriger vers connexion si non authentifié */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/connexion");
    }
  }, [isAuthenticated, isLoading, router]);

  /* Initiales de l'utilisateur */
  const initials =
    (user?.user_metadata?.prenom as string | undefined)?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "M";

  const displayName =
    user?.user_metadata?.prenom && user?.user_metadata?.nom
      ? `${user.user_metadata.prenom as string} ${user.user_metadata.nom as string}`
      : user?.email ?? "Membre";

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  /* Écran de chargement */
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Users className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay mobile */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="border-b border-border px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 font-display text-lg font-semibold text-primary"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="size-4" />
            </span>
            AITO
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Espace membre</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Menu
          </p>
          <ul className="space-y-1">
            {MEMBRE_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto size-3 opacity-50" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Retour au site public */}
          <div className="mt-6 border-t border-border pt-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              ← Retour au site public
            </Link>
          </div>
        </nav>

        {/* Profil utilisateur + déconnexion */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Se déconnecter
          </Button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Header mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="font-display text-lg font-semibold text-primary">AITO</span>
        </header>

        {/* Contenu des pages membre */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
