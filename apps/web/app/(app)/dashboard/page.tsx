"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Ancienne route /dashboard → redirige vers /tableau-de-bord */
export default function OldDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tableau-de-bord");
  }, [router]);

  return null;
}
