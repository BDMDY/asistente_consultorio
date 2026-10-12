import type { MetadataRoute } from "next";
import { pwaBrand } from "@/lib/backend/pwa";

export const revalidate = 30;

/** Permite instalar el sitio como app («Agregar a la pantalla de inicio»), con el nombre, color e ícono de la clínica. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await pwaBrand();
  return {
    name: b.name,
    short_name: b.name.length > 12 ? b.name.split(/\s+/)[0].slice(0, 12) : b.name,
    description: b.slogan || undefined,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: b.color,
    lang: "es-PE",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?m=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
