"use client";
import { errText, getClient } from "./client";
import { isRemote } from "./config";
import { getCtx } from "./sync";

export const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
const BUCKET = "clinic-media";
const MARK = `/storage/v1/object/public/${BUCKET}/`;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

const extOf = (f: File) => (f.type === "video/webm" || /\.webm$/i.test(f.name) ? "webm" : f.type === "video/mp4" || /\.mp4$/i.test(f.name) ? "mp4" : "");

/** Duración del video en segundos (lee solo los metadatos). */
const durationOf = (f: File) => new Promise<number>((res, rej) => {
  const v = document.createElement("video");
  const url = URL.createObjectURL(f);
  v.preload = "metadata";
  v.onloadedmetadata = () => { URL.revokeObjectURL(url); res(v.duration); };
  v.onerror = () => { URL.revokeObjectURL(url); rej(new Error("video")); };
  v.src = url;
});

/** Valida el archivo antes de subirlo; devuelve el mensaje de error o null. */
export function checkVideoFile(f: { name: string; type: string; size: number }): string | null {
  if (!extOf(f as File)) return "Formato no permitido. Usa un video MP4 o WebM";
  if (f.size > MAX_VIDEO_BYTES) return `El video pesa ${(f.size / 1048576).toFixed(1)} MB y el máximo es 10 MB. Compáctalo (por ejemplo con HandBrake) o recórtalo`;
  return null;
}

/** Sube un video del hero al almacenamiento de la clínica y devuelve su enlace público. */
export async function uploadHeroVideo(file: File): Promise<UploadResult> {
  const c = getCtx();
  if (!isRemote || !c) return { ok: false, error: "La subida de videos funciona al conectar el servidor. Mientras tanto, pega un enlace." };
  const bad = checkVideoFile(file);
  if (bad) return { ok: false, error: bad };
  try {
    const d = await durationOf(file);
    if (d > MAX_VIDEO_SECONDS) return { ok: false, error: `El video dura ${Math.round(d)} s; para el hero conviene de 5 a 15 s (máximo ${MAX_VIDEO_SECONDS} s)` };
  } catch {
    return { ok: false, error: "No pude leer el video. Prueba con otro archivo MP4 o WebM" };
  }
  const path = `${c.clinicId}/hero/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${extOf(file)}`;
  const db = getClient();
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || (extOf(file) === "webm" ? "video/webm" : "video/mp4"), cacheControl: "31536000", upsert: false });
  if (error) return { ok: false, error: errText(error) };
  return { ok: true, url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Borra el archivo si el enlace es de nuestro almacenamiento (no hace nada con enlaces externos). */
export async function removeHostedVideo(url: string): Promise<void> {
  if (!isRemote || !url.includes(MARK)) return;
  try {
    await getClient().storage.from(BUCKET).remove([decodeURIComponent(url.split(MARK)[1].split("?")[0])]);
  } catch { /* si falla, queda un archivo huérfano pero el sitio no se afecta */ }
}

export const isHostedVideo = (url: string) => url.includes(MARK);
