"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, PlusSquare, Sparkles, SwatchBook, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const navigation = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projets/nouveau", label: "Nouveau projet", icon: PlusSquare },
    { href: "/profil-marque", label: "Profil de marque", icon: SwatchBook }
];
const pageTitles = {
    "/dashboard": "Dashboard",
    "/projets/nouveau": "Nouveau projet",
    "/profil-marque": "Profil de marque"
};
export function AppShell(props) {
    const pathname = usePathname();
    const router = useRouter();
    const { currentOrganization, isAuthenticated, isLoading, signOut, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/connexion");
        }
    }, [isAuthenticated, isLoading, router]);
    const title = useMemo(() => {
        if (pathname.startsWith("/projets/") && pathname !== "/projets/nouveau") {
            return "Détail projet";
        }
        return pageTitles[pathname] ?? "Agents Marketing";
    }, [pathname]);
    const initials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((chunk) => chunk[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "AM";
    async function handleSignOut() {
        await signOut();
        router.replace("/connexion");
    }
    if (isLoading || !isAuthenticated) {
        return (<div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface mesh-panel w-full max-w-xl rounded-[2rem] border px-8 py-12 text-center">
          <p className="font-display text-sm uppercase tracking-[0.35em] text-primary">Synchronisation</p>
          <h1 className="mt-5 font-display text-4xl">Ouverture du cockpit client</h1>
        </div>
      </div>);
    }
    return (<div className="min-h-screen">
      {mobileOpen ? (<button type="button" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)}/>) : null}

      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-white/10 bg-background/90 p-5 backdrop-blur-xl transition-transform md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="surface mesh-panel rounded-[1.75rem] border p-5">
          <p className="font-display text-xl">Agents Marketing</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Espace client orchestré pour piloter vos agents et vos livrables.
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigation.map((item) => (<Link key={item.href} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition", pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-white text-background"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground")} href={item.href} onClick={() => setMobileOpen(false)}>
              <item.icon className="size-4"/>
              {item.label}
            </Link>))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="surface rounded-[1.75rem] border p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary"/>
              <div>
                <p className="text-sm font-medium">{currentOrganization?.name ?? "Organisation"}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {currentOrganization?.plan ?? "starter"}
                </p>
              </div>
            </div>
          </div>
          <Button className="w-full" variant="secondary" onClick={handleSignOut}>
            <LogOut className="size-4"/>
            Se déconnecter
          </Button>
        </div>
      </aside>

      <div className="md:pl-[18.5rem]">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-background/75 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button className="md:hidden" size="icon" variant="outline" onClick={() => setMobileOpen((value) => !value)}>
                {mobileOpen ? <X className="size-4"/> : <Menu className="size-4"/>}
              </Button>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Interface client</p>
                <h1 className="font-display text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.full_name ?? "Client"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{props.children}</main>
      </div>
    </div>);
}
