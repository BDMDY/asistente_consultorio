import type { Metadata } from "next";
import Guard from "@/components/intranet/Guard";
import Medios from "@/components/intranet/marca/Medios";

export const metadata: Metadata = { title: "Medios del sitio" };

export default function Page() {
  return (
    <Guard perm="Configuración">
      <Medios />
    </Guard>
  );
}
