/** Cifrado de respaldos con contraseña: PBKDF2 (SHA-256) + AES-GCM, con WebCrypto (navegador y Node). */
const ITER = 250_000;
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => { let s = ""; u.forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedBackup { v: 1; alg: "AES-GCM/PBKDF2-SHA256"; iter: number; salt: string; iv: string; data: string }

export async function encryptBackup(text: string, pass: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, ITER);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(text)));
  const out: EncryptedBackup = { v: 1, alg: "AES-GCM/PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data) };
  return JSON.stringify(out);
}

/** Descifra un respaldo; lanza un error si la contraseña es incorrecta o el archivo fue modificado. */
export async function decryptBackup(json: string, pass: string): Promise<string> {
  const f = JSON.parse(json) as EncryptedBackup;
  if (f.v !== 1 || !f.data) throw new Error("Formato de respaldo no reconocido");
  const key = await deriveKey(pass, unb64(f.salt), f.iter);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.iv) as BufferSource }, key, unb64(f.data)));
  } catch {
    throw new Error("Contraseña incorrecta o archivo dañado");
  }
}
