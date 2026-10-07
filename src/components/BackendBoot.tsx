"use client";
import { useEffect } from "react";
import { initBackend } from "@/lib/backend/auth";

/** Conecta con Supabase al abrir la app (no hace nada en modo demo). */
export default function BackendBoot() {
  useEffect(() => {
    initBackend();
  }, []);
  return null;
}
