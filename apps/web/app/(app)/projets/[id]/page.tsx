"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Ancienne route /projets/[id] → redirige vers /tableau-de-bord */
export default function OldProjectDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tableau-de-bord");
  }, [router]);

  return null;
}
