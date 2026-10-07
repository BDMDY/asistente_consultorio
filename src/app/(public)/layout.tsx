import ConsentBanner from "@/components/public/ConsentBanner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ConsentBanner />
    </>
  );
}
