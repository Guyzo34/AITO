"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Ancienne route /profil-marque → redirige vers /profil */
export default function OldBrandProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profil");
  }, [router]);

  return null;
}
