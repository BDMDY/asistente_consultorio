// Descifra un respaldo de DentAssist (.cifrado.json) y lo guarda como JSON normal.
// Uso:  node scripts/descifrar-respaldo.mjs respaldo-dentalmavila-2026-10-23.cifrado.json salida.json
// La contraseña se pide por teclado (no queda en el historial).
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";

const [, , entrada, salida] = process.argv;
if (!entrada || !salida) { console.error("Uso: node scripts/descifrar-respaldo.mjs <archivo.cifrado.json> <salida.json>"); process.exit(1); }
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Contraseña del respaldo: ", (pass) => {
  rl.close();
  const f = JSON.parse(readFileSync(entrada, "utf8"));
  const key = pbkdf2Sync(pass, Buffer.from(f.salt, "base64"), f.iter, 32, "sha256");
  const raw = Buffer.from(f.data, "base64");
  const tag = raw.subarray(raw.length - 16), body = raw.subarray(0, raw.length - 16); // AES-GCM: la etiqueta va al final
  try {
    const d = createDecipheriv("aes-256-gcm", key, Buffer.from(f.iv, "base64"));
    d.setAuthTag(tag);
    writeFileSync(salida, Buffer.concat([d.update(body), d.final()]));
    console.log("Listo: " + salida);
  } catch { console.error("Contraseña incorrecta o archivo dañado."); process.exit(1); }
});
