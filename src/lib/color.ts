/** Derivación de la escala de marca 50–950 desde un solo color (port de DA.derive del prototipo). */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl([r0, g0, b0]: [number, number, number]): [number, number, number] {
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2, d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function hslToHex(h: number, s0: number, l0: number): string {
  const s = s0 / 100, l = l0 / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return ("#" + f(0) + f(8) + f(4)).toUpperCase();
}

function luminance(hex: string) {
  const c = hexToRgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type BrandVars = Record<string, string>;

/** Escala de marca; el paso 700 se oscurece hasta cumplir AA (4.5) con texto blanco. */
export function deriveBrand(input: string): BrandVars {
  let hex = /^#?[0-9a-f]{6}$/i.test(input || "") ? input : "#00A86B";
  if (hex[0] !== "#") hex = "#" + hex;
  hex = hex.toUpperCase();
  const [h, s0, l0] = rgbToHsl(hexToRgb(hex));
  const s = clamp(s0, 25, 100), l = clamp(l0, 30, 56);
  let L7 = l * 0.7, c7 = hslToHex(h, s, L7), i = 0;
  while (contrast(c7, "#FFFFFF") < 4.5 && i < 25) {
    L7 -= 2;
    c7 = hslToHex(h, s, L7);
    i++;
  }
  const T: Record<number, number> = {
    50: 96, 100: 91, 200: 83, 300: 72,
    400: l + (72 - l) * 0.45,
    500: l,
    600: Math.max(l * 0.86, L7 + 6),
    700: L7,
    800: Math.max(6, Math.min(l * 0.56, L7 - 8)),
    900: Math.max(5, Math.min(l * 0.43, L7 - 15)),
    950: Math.max(3, Math.min(l * 0.27, L7 - 22)),
  };
  const out: BrandVars = {};
  for (const k of BRAND_STEPS) out["--brand-" + k] = hslToHex(h, k <= 300 ? s * 0.92 : k >= 800 ? s * 0.85 : s, T[k]);
  out["--brand-500"] = hex;
  return out;
}

export function deriveAccent(hex: string): BrandVars {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  return { "--accent-500": hex, "--accent-100": hslToHex(h, clamp(s, 30, 90), 92) };
}
