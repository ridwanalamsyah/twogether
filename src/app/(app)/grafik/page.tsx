"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Charts now live inside the menu their data belongs to (Sehat, Belajar,
 * Goals, Laporan). Old links to /grafik land on Sehat.
 */
export default function GrafikRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sehat");
  }, [router]);
  return null;
}
