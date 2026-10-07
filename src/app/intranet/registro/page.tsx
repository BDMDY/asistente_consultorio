import type { Metadata } from "next";
import Registro from "@/components/intranet/Registro";

export const metadata: Metadata = { title: "Configurar clínica" };

export default function Page() {
  return <Registro />;
}
