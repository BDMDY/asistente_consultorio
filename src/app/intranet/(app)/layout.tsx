import IntranetShell from "@/components/intranet/IntranetShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <IntranetShell>{children}</IntranetShell>;
}
