import { redirect } from "next/navigation";

/** Enlace anterior: el portal ahora se llama «Clientes». */
export default function Page() {
  redirect("/clientes");
}
