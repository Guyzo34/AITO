/*
 * Composant hérité du projet précédent — remplacé par MembreNav pour la plateforme AITO.
 * Ce fichier est conservé pour éviter de casser l'historique git.
 */

import type { ReactNode } from "react";

export function AppShell(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
