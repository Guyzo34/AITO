import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

/* Layout partagé pour toutes les pages publiques internes */
export default function PublicLayout(props: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{props.children}</main>
      <Footer />
    </div>
  );
}
