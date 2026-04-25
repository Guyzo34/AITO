"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Ancienne route /projets/nouveau → redirige vers /tableau-de-bord */
export default function OldNewProjectRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tableau-de-bord");
  }, [router]);

  return null;
}
