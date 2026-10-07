import type { Metadata } from "next";
import Inicio from "@/components/intranet/Inicio";

export const metadata: Metadata = { title: "Inicio" };

export default function Page() {
  return <Inicio />;
}
