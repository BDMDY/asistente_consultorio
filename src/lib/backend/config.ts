/** Modo remoto: se activa solo cuando están definidas las tres variables. Sin ellas la app funciona en modo demo (localStorage). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const CLINIC_SLUG = process.env.NEXT_PUBLIC_CLINIC_SLUG ?? "";
export const isRemote = Boolean(SUPABASE_URL && SUPABASE_KEY && CLINIC_SLUG);
