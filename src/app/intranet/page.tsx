import type { Metadata } from "next";
import Login from "@/components/intranet/Login";

export const metadata: Metadata = { title: "Acceso del personal" };

export default function Page() {
  return <Login />;
}
