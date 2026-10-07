"use client";
import { useBrand } from "@/lib/brand";
import { useMedia } from "@/lib/media";
import Icon from "./ui/Icon";

/** Logo de la empresa: imagen subida (claro/oscuro) o, si no hay, ícono + nombre comercial. */
export default function BrandMark({ size = "md", onDark = false }: { size?: "sm" | "md"; onDark?: boolean }) {
  const brand = useBrand();
  const { img } = useMedia();
  const src = onDark ? img.logoD : img.logoL;
  const box = size === "sm" ? 28 : 36;
  if (src) {
    return (
      <span
        role="img"
        aria-label={brand.name}
        style={{ display: "block", width: size === "sm" ? 140 : 220, height: size === "sm" ? 28 : 40, backgroundImage: `url("${src}")`, backgroundRepeat: "no-repeat", backgroundSize: "contain", backgroundPosition: "left center" }}
      />
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size === "sm" ? 8 : 10, fontWeight: 800, fontSize: size === "sm" ? 16 : 20, color: onDark ? "#fff" : "var(--ink-900)", whiteSpace: "nowrap" }}>
      <span style={{ width: box, height: box, borderRadius: size === "sm" ? 8 : 10, background: "var(--grad-btn)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="smile" size={size === "sm" ? 16 : 20} />
      </span>
      {brand.name}
    </span>
  );
}
