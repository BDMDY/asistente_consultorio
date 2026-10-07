import type { Metadata } from "next";
import Guard from "@/components/intranet/Guard";
import Marca from "@/components/intranet/marca/Marca";

export const metadata: Metadata = { title: "Configuración de marca" };

export default function Page() {
  return (
    <Guard perm="Configuración">
      <Marca />
    </Guard>
  );
}
