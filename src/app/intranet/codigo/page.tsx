import type { Metadata } from "next";
import CodigoAcceso from "@/components/intranet/CodigoAcceso";

export const metadata: Metadata = { title: "Registro con código" };

export default function Page() {
  return <CodigoAcceso />;
}
