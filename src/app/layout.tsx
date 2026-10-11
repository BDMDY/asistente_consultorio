import type { Metadata, Viewport } from "next";
import BackendBoot from "@/components/BackendBoot";
import BrandProvider from "@/components/BrandProvider";
import SiteSeed from "@/components/SiteSeed";
import { isRemote } from "@/lib/backend/config";
import { getSite, letterFavicon } from "@/lib/backend/site-server";
import type { BrandConfig } from "@/lib/brand";
import "@/styles/globals.css";

/** Las páginas se regeneran cada 30 s con la marca vigente de la clínica. */
export const revalidate = 30;

/** Título, descripción y favicon reales de la clínica (si el servidor no responde, los genéricos del producto). */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  if (!site) {
    // Sin la marca de la clínica (modo remoto): nada que pueda confundirse con otra clínica hasta que cargue.
    if (isRemote) return { title: "Cargando…", icons: { icon: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"/>') } };
    return { title: "DentAssist", description: "Agenda, pacientes, historia clínica e inventario para consultorios de odontología, ortodoncia y medicina.", icons: { icon: "/icon.svg" } };
  }
  const brand = (site.brand as Partial<BrandConfig> | null) ?? {};
  const media = (site.media as { img?: { favicon?: string } } | null) ?? {};
  const name = brand.name || site.clinic?.name || "Clínica";
  const color = /^#[0-9a-f]{6}$/i.test(brand.hex ?? "") ? brand.hex! : "#00875A";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: brand.heroSub || brand.slogan || undefined,
    icons: { icon: media.img?.favicon || letterFavicon(name, color) },
    openGraph: { title: name, description: brand.heroSub || brand.slogan || undefined, siteName: name },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const FONTS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Lora:wght@500;700&family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:wght@500;700&display=swap";

// Evita el destello de tema: aplica el tema guardado antes del primer pintado.
const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem('da-theme-v1')||'"light"');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <html lang="es-PE" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONTS} rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SiteSeed site={site} />
        <BackendBoot />
        <BrandProvider />
        {children}
      </body>
    </html>
  );
}
