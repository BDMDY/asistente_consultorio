import type { Metadata } from "next";
import Privacidad from "@/components/public/Privacidad";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function Page() {
  return <Privacidad />;
}
