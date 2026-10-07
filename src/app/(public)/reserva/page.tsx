import type { Metadata } from "next";
import Reserva from "@/components/public/Reserva";

export const metadata: Metadata = { title: "Reservar cita" };

export default function Page() {
  return <Reserva />;
}
