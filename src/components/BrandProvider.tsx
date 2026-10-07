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
  useEffect(() => {
    if (!img.favicon) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-da]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.da = "1";
      document.head.appendChild(link);
    }
    link.href = img.favicon;
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
