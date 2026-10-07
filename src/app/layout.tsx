import type { Metadata, Viewport } from "next";
import BackendBoot from "@/components/BackendBoot";
import BrandProvider from "@/components/BrandProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DentAssist",
  description: "Agenda, pacientes, historia clínica e inventario para consultorios de odontología, ortodoncia y medicina.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const FONTS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Lora:wght@500;700&family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:wght@500;700&display=swap";

// Evita el destello de tema: aplica el tema guardado antes del primer pintado.
const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem('da-theme-v1')||'"light"');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONTS} rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <BackendBoot />
        <BrandProvider />
        {children}
      </body>
    </html>
  );
}
