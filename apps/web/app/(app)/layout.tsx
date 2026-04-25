import type { ReactNode } from "react";
import { MembreNav } from "@/components/layout/membre-nav";

/* Layout protégé pour l'espace membre */
export default function MembreLayout(props: { children: ReactNode }) {
  return <MembreNav>{props.children}</MembreNav>;
}
