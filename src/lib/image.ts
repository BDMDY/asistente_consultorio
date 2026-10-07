/** Carga de imágenes del navegador: valida formato y tamaño y reduce las fotos antes de guardarlas. */
export const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const MAX_BYTES = 2 * 1024 * 1024;

export type ImageResult = { ok: true; dataUrl: string } | { ok: false; error: string };

const readAsDataURL = (f: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(new Error("lectura"));
  r.readAsDataURL(f);
});

/** `logo` conserva transparencia (PNG); las fotos se reducen a 1000 px en JPEG. */
export async function loadImage(file: File, opts: { logo?: boolean } = {}): Promise<ImageResult> {
  if (!IMG_TYPES.includes(file.type)) return { ok: false, error: "Formato no permitido. Usa PNG, JPG, WebP o SVG" };
  if (file.size > MAX_BYTES) return { ok: false, error: `El archivo supera 2 MB (${(file.size / 1048576).toFixed(1)} MB)` };
  try {
    const src = await readAsDataURL(file);
    if (file.type === "image/svg+xml") return { ok: true, dataUrl: src };
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("imagen"));
      i.src = src;
    });
    const max = opts.logo ? 800 : 1000;
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return { ok: true, dataUrl: opts.logo ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82) };
  } catch {
    return { ok: false, error: "No se pudo leer la imagen" };
  }
}
