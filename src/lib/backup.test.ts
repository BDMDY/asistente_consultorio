// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { decryptBackup, encryptBackup } from "./backup-crypto";

describe("respaldo cifrado", () => {
  it("se descifra con la contraseña correcta y falla con otra", async () => {
    const texto = JSON.stringify({ pacientes: [{ name: "Ñandú Pérez", dni: "12345678" }] });
    const c = await encryptBackup(texto, "clave-segura");
    expect(c).not.toContain("Ñandú");
    expect(await decryptBackup(c, "clave-segura")).toBe(texto);
    await expect(decryptBackup(c, "otra")).rejects.toThrow(/incorrecta/);
    const f = JSON.parse(c);
    f.data = f.data.slice(0, -4) + "AAAA"; // archivo alterado
    await expect(decryptBackup(JSON.stringify(f), "clave-segura")).rejects.toThrow();
  });
  it("el script de línea de comandos usa el mismo formato", async () => {
    const c = JSON.parse(await encryptBackup("hola", "pw"));
    const key = pbkdf2Sync("pw", Buffer.from(c.salt, "base64"), c.iter, 32, "sha256");
    const raw = Buffer.from(c.data, "base64");
    const d = createDecipheriv("aes-256-gcm", key, Buffer.from(c.iv, "base64"));
    d.setAuthTag(raw.subarray(raw.length - 16));
    expect(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString()).toBe("hola");
  });
});
