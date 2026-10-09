"use client";
import { usePathname } from "next/navigation";
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
  // Favicon de la empresa: se cambia el atributo del <link rel="icon"> que ya existe (sin quitar ni insertar nodos que Next
  // administra; hacerlo rompe la navegación). Al quitarlo se restaura el predeterminado.
  const pathname = usePathname();
  useEffect(() => {
    const href = img.favicon;
    const apply = () => {
      const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
      for (const l of links) {
        if (l.dataset.origHref === undefined) { l.dataset.origHref = l.getAttribute("href") ?? ""; l.dataset.origType = l.type; }
        if (href) {
          l.type = /^data:([^;,]+)/.exec(href)?.[1] ?? "";
          l.setAttribute("sizes", "any");
          if (l.getAttribute("href") !== href) l.href = href;
        } else if (l.dataset.origHref) {
          l.type = l.dataset.origType ?? "";
          l.setAttribute("href", l.dataset.origHref);
        }
      }
      return links.length;
    };
    // Next agrega su ícono después de que carga la página: se reintenta unos instantes (solo cambia atributos, nunca quita nodos).
    const timers = [0, 300, 1000, 2500].map((ms) => setTimeout(apply, ms));
    // Si no hay ningún ícono (no debería pasar), se crea uno.
    const last = setTimeout(() => {
      if (href && !document.querySelector('link[rel~="icon"]')) {
        const l = document.createElement("link");
        l.rel = "icon";
        document.head.appendChild(l);
        apply();
      }
    }, 3000);
    return () => { timers.forEach(clearTimeout); clearTimeout(last); };
  }, [img.favicon, pathname]);

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
