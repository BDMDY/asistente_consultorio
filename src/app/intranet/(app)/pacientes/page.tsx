import type { Metadata } from "next";
import { Suspense } from "react";
import Pacientes from "@/components/intranet/pacientes/Pacientes";

export const metadata: Metadata = { title: "Pacientes" };

export default function Page() {
  return (
    <Suspense>
      <Pacientes />
    </Suspense>
  );
}
