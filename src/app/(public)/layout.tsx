import ConsentBanner from "@/components/public/ConsentBanner";
import PublicGate from "@/components/public/PublicGate";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicGate>{children}</PublicGate>
      <ConsentBanner />
    </>
  );
}
