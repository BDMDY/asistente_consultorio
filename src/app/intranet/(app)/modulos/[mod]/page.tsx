import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Modulo from "@/components/intranet/modulos/Modulo";
import { MODULE_SLUGS, isModuleSlug } from "@/lib/module-slugs";

export const metadata: Metadata = { title: "Módulo" };

export function generateStaticParams() {
  return MODULE_SLUGS.map((mod) => ({ mod }));
}

export default async function Page({ params }: { params: Promise<{ mod: string }> }) {
  const { mod } = await params;
  if (!isModuleSlug(mod)) notFound();
  return <Modulo slug={mod} />;
}
