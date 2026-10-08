import type { Metadata } from "next";
import MisCitas from "@/components/public/MisCitas";

export const metadata: Metadata = { title: "Consultar mis citas" };

export default function Page() {
  return <MisCitas />;
}
