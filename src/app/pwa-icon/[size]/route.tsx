import { ImageResponse } from "next/og";
import { pwaBrand } from "@/lib/backend/pwa";

export const revalidate = 30;

const SIZES = new Set([180, 192, 512]);

/** Ícono de la app: el favicon de la clínica centrado sobre su color (o la inicial si no hay favicon). */
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.has(n)) return new Response("No encontrado", { status: 404 });
  const b = await pwaBrand();
  const maskable = new URL(req.url).searchParams.has("m");
  const pad = Math.round(n * (maskable ? 0.22 : 0.16)); // zona segura: el sistema puede recortar los bordes
  const inner = n - pad * 2;
  const letter = (b.name.trim()[0] ?? "C").toUpperCase();
  const render = (withImg: boolean) =>
    new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: withImg ? "#ffffff" : b.color, color: "#fff", fontSize: Math.round(n * 0.55), fontWeight: 700 }}>
          {withImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.icon} width={inner} height={inner} alt="" style={{ objectFit: "contain" }} />
          ) : (
            letter
          )}
        </div>
      ),
      { width: n, height: n },
    );
  const cache = { "Cache-Control": "public, max-age=300, s-maxage=300" };
  if (b.icon) {
    try {
      const r = render(true);
      const res = new Response(await r.arrayBuffer(), { headers: { "Content-Type": "image/png", ...cache } });
      return res;
    } catch { /* si el favicon no se puede leer, se usa la inicial */ }
  }
  const r = render(false);
  return new Response(await r.arrayBuffer(), { headers: { "Content-Type": "image/png", ...cache } });
}
