import type { Metadata } from "next";
import NuevaClave from "@/components/intranet/NuevaClave";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function Page() {
  return <NuevaClave />;
}
