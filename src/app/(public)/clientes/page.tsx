import type { Metadata } from "next";
import Clientes from "@/components/public/Clientes";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <Clientes />;
}
