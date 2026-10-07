import type { Metadata } from "next";
import MiCita from "@/components/public/MiCita";

export const metadata: Metadata = { title: "Mi cita" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MiCita id={Number(id)} />;
}
