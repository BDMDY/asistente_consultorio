// @vitest-environment node
import { describe, expect, it } from "vitest";
import { encodePath, sha256Hex, signRequest } from "../../supabase/functions/backup-b2/sigv4";

describe("firma AWS SigV4", () => {
  it("coincide con el ejemplo oficial de AWS (GET Object con Range)", async () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
    const r = await signRequest({
      method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt", headers: { range: "bytes=0-9" },
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      region: "us-east-1", service: "s3", accessKey: "AKIAIOSFODNN7EXAMPLE", secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", amzDate: "20130524T000000Z",
    });
    expect(r.signedHeaders).toBe("host;range;x-amz-content-sha256;x-amz-date");
    expect(r.signature).toBe("f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  });
  it("hash vacío y codificación de rutas", async () => {
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(encodePath("/bucket/a b/ñ+(1).json")).toBe("/bucket/a%20b/%C3%B1%2B%281%29.json");
  });
});
