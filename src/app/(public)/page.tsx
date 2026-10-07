import type { Metadata } from "next";
import Landing from "@/components/public/Landing";

export const metadata: Metadata = { title: "Inicio" };

export default function Page() {
  return <Landing />;
}
