"use client";
import { useEffect } from "react";
import { useBrand } from "@/lib/brand";
import { useMedia } from "@/lib/media";
import { themeStore } from "@/lib/theme";

/**
 * Aplica la marca de la empresa (escala --brand-*, acento, tipografías) y el tema claro/oscuro.
 * En producción el bloque CSS se genera en el servidor por empresa; aquí sale del store de marca.
 */
export default function BrandProvider() {
  const brand = useBrand();
  const [theme] = themeStore.useStore();
  const { img } = useMedia();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Favicon de la empresa (si subió uno); si no, queda el predeterminado.
  // El navegador elige entre todos los <link rel="icon">: se quitan los predeterminados de Next y queda solo el de la empresa
  // (si se vuelve a insertar alguno al navegar, se vuelve a quitar).
  useEffect(() => {
    const href = img.favicon;
    if (!href) {
      document.querySelector('link[data-da="favicon"]')?.remove();
      return;
    }
    const others = () => document.querySelectorAll('link[rel~="icon"]:not([data-da]), link[rel="apple-touch-icon"]:not([data-da])');
    let link = document.querySelector<HTMLLinkElement>('link[data-da="favicon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.da = "favicon";
      document.head.appendChild(link);
    }
    link.type = /^data:([^;,]+)/.exec(href)?.[1] ?? "";
    link.setAttribute("sizes", "any");
    link.href = href;
    others().forEach((n) => n.remove());
    const mo = new MutationObserver(() => others().forEach((n) => n.remove()));
    mo.observe(document.head, { childList: true });
    return () => mo.disconnect();
  }, [img.favicon]);

  const keepInDark = ["--brand-50", "--brand-100", "--brand-800"];
  let light = `--font-sans:${brand.body};--font-display:${brand.head};`;
  let dark = light;
  for (const [k, v] of Object.entries(brand.vars)) {
    light += `${k}:${v};`;
    if (!keepInDark.includes(k)) dark += `${k}:${v};`;
  }
  const css = `:root:not([data-theme="dark"]){${light}}html[data-theme="dark"]{${dark}}`;
  return <style id="da-brand-vars" dangerouslySetInnerHTML={{ __html: css }} />;
}
