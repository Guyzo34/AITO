import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Syne } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

/* Police principale */
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans"
});

/* Police d'affichage pour les titres */
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne"
});

export const metadata: Metadata = {
  title: {
    default: "AITO — Association des Ivoiriens de Toulouse et de l'Occitanie",
    template: "%s | AITO"
  },
  description:
    "L'Association des Ivoiriens de Toulouse et de l'Occitanie unit la communauté ivoirienne de Toulouse et de l'Occitanie autour de valeurs de solidarité, de culture et d'entraide.",
  keywords: ["AITO", "Ivoiriens", "Toulouse", "Haute-Garonne", "association", "communauté", "Côte d'Ivoire"],
  openGraph: {
    title: "AITO — Association des Ivoiriens de Toulouse et de l'Occitanie",
    description: "Solidarité, culture et entraide — la communauté ivoirienne à Toulouse.",
    locale: "fr_FR",
    type: "website"
  }
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${instrumentSans.variable} ${syne.variable}`}>
      <body>
        <ToastProvider>
          <AuthProvider>{props.children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
