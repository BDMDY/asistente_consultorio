import type { Metadata } from "next";
import { Suspense } from "react";
import Agenda from "@/components/intranet/agenda/Agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return (
    <Suspense>
      <Agenda />
    </Suspense>
  );
}
