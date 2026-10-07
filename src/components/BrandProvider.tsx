"use client";
import { useEffect } from "react";
import { useBrand } from "@/lib/brand";
import { themeStore } from "@/lib/theme";

/**
 * Aplica la marca de la empresa (escala --brand-*, acento, tipografías) y el tema claro/oscuro.
 * En producción el bloque CSS se genera en el servidor por empresa; aquí sale del store de marca.
 */
export default function BrandProvider() {
  const brand = useBrand();
  const [theme] = themeStore.useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
