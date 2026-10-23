// Firma AWS Signature V4 (WebCrypto) para hablar con almacenamientos compatibles con S3, como Backblaze B2.
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export const sha256Hex = async (data: string | Uint8Array) => hex(await crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : (data as BufferSource)));

async function hmac(key: ArrayBuffer | Uint8Array | string, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", (typeof key === "string" ? enc.encode(key) : key) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

/** Codifica cada segmento de la ruta como pide S3 (los «/» se conservan). */
export const encodePath = (p: string) => p.split("/").map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())).join("/");

export interface SignInput {
  method: string; host: string; path: string; query?: string; headers?: Record<string, string>; payloadHash: string;
  region: string; service: string; accessKey: string; secretKey: string; /** AAAAMMDDTHHMMSSZ */ amzDate: string;
}

/** Devuelve el encabezado Authorization (y la lista de encabezados firmados). Los encabezados `host`, `x-amz-date` y `x-amz-content-sha256` se agregan solos. */
export async function signRequest(i: SignInput): Promise<{ authorization: string; signedHeaders: string; signature: string }> {
  const h: Record<string, string> = { host: i.host, "x-amz-content-sha256": i.payloadHash, "x-amz-date": i.amzDate };
  for (const [k, v] of Object.entries(i.headers ?? {})) h[k.toLowerCase()] = v.trim();
  const names = Object.keys(h).sort();
  const canonicalHeaders = names.map((n) => `${n}:${h[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonical = [i.method, encodePath(i.path), i.query ?? "", canonicalHeaders, signedHeaders, i.payloadHash].join("\n");
  const day = i.amzDate.slice(0, 8);
  const scope = `${day}/${i.region}/${i.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", i.amzDate, scope, await sha256Hex(canonical)].join("\n");
  let k: ArrayBuffer = await hmac("AWS4" + i.secretKey, day);
  k = await hmac(k, i.region);
  k = await hmac(k, i.service);
  k = await hmac(k, "aws4_request");
  const signature = hex(await hmac(k, toSign));
  return { authorization: `AWS4-HMAC-SHA256 Credential=${i.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`, signedHeaders, signature };
}

/** Sube un archivo con PUT. Lanza un error con el código HTTP si el almacenamiento lo rechaza. */
export async function putObject(o: { endpoint: string; region: string; bucket: string; key: string; body: Uint8Array; accessKey: string; secretKey: string; contentType?: string }): Promise<void> {
  const host = new URL(o.endpoint).host;
  const path = `/${o.bucket}/${o.key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const payloadHash = await sha256Hex(o.body);
  const { authorization } = await signRequest({ method: "PUT", host, path, headers: { "content-type": o.contentType ?? "application/octet-stream" }, payloadHash, region: o.region, service: "s3", accessKey: o.accessKey, secretKey: o.secretKey, amzDate });
  const res = await fetch(`${o.endpoint}${encodePath(path)}`, { method: "PUT", headers: { Authorization: authorization, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "content-type": o.contentType ?? "application/octet-stream" }, body: o.body as BodyInit });
  if (!res.ok) throw new Error(`El almacenamiento respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
