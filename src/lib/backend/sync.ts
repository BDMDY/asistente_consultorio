import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "../toast";
import { errText } from "./client";

export interface Ctx { db: SupabaseClient; clinicId: string }
export interface PublicSite { clinic?: { id: string; name: string; slug: string }; brand?: unknown; media?: unknown; doctors?: unknown }

/** Adaptador de un store con Supabase. `save` recibe el estado anterior y el nuevo y escribe solo la diferencia. */
export interface RemoteSpec<T> {
  tables: string[];
  load: (ctx: Ctx) => Promise<T>;
  save: (prev: T, next: T, ctx: Ctx) => Promise<void>;
  /** estado derivado del sitio público (visitantes sin sesión) */
  fromPublic?: (site: PublicSite) => T;
}

interface StoreHandle { hydrate: (v: unknown) => void; reset: () => void }

const specs = new Map<string, RemoteSpec<unknown>>();
const stores = new Map<string, StoreHandle>();
const pending = new Map<string, number>();
const version = new Map<string, number>();
const chains = new Map<string, Promise<void>>();
let ctx: Ctx | null = null;

export const defineSpec = <T,>(name: string, spec: RemoteSpec<T>) => void specs.set(name, spec as RemoteSpec<unknown>);
export const registerStore = (name: string, handle: StoreHandle) => void stores.set(name, handle);
export const setCtx = (c: Ctx | null) => void (ctx = c);
export const getCtx = () => ctx;

/** Recarga un store desde la base; se descarta si mientras tanto hubo cambios locales sin guardar. */
export async function refresh(name: string): Promise<void> {
  const spec = specs.get(name);
  const store = stores.get(name);
  if (!spec || !store || !ctx) return;
  const v0 = version.get(name) ?? 0;
  try {
    const value = await spec.load(ctx);
    if ((pending.get(name) ?? 0) === 0 && (version.get(name) ?? 0) === v0) store.hydrate(value);
  } catch (e) {
    toast("No se pudo actualizar: " + errText(e));
  }
}

export const refreshAll = async () => void (await Promise.all([...stores.keys()].map(refresh)));
export const resetAll = () => stores.forEach((s) => s.reset());

/** Encola el guardado de un cambio (en orden por store). Si falla, avisa y vuelve al estado del servidor. */
export function queueSave(name: string, prev: unknown, next: unknown) {
  const spec = specs.get(name);
  if (!spec || !ctx) {
    toast("Sin sesión: el cambio no se guardó");
    void refresh(name);
    return;
  }
  const c = ctx;
  version.set(name, (version.get(name) ?? 0) + 1);
  pending.set(name, (pending.get(name) ?? 0) + 1);
  const run = (chains.get(name) ?? Promise.resolve()).then(async () => {
    try {
      await spec.save(prev, next, c);
    } catch (e) {
      toast(errText(e));
      version.set(name, (version.get(name) ?? 0) + 1);
    }
  });
  chains.set(
    name,
    run.finally(() => {
      const left = (pending.get(name) ?? 1) - 1;
      pending.set(name, left);
      if (left === 0) void refresh(name);
    }),
  );
}

/** Carga el sitio público (marca y medios) para visitantes sin sesión. */
export async function loadPublic(db: SupabaseClient, slug: string) {
  const { data, error } = await db.rpc("public_site", { p_slug: slug });
  if (error || !data) return;
  const site = data as PublicSite;
  for (const [name, spec] of specs) if (spec.fromPublic) stores.get(name)?.hydrate(spec.fromPublic(site));
}

// ───────── Tiempo real ─────────
let channel: ReturnType<SupabaseClient["channel"]> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const dirty = new Set<string>();

export function startRealtime(c: Ctx) {
  stopRealtime(c.db);
  const tables = new Set([...specs.values()].flatMap((s) => s.tables));
  let ch = c.db.channel("clinic-" + c.clinicId);
  for (const table of tables) {
    ch = ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `clinic_id=eq.${c.clinicId}` }, () => {
      dirty.add(table);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const t = new Set(dirty);
        dirty.clear();
        for (const [name, spec] of specs) if (spec.tables.some((x) => t.has(x))) void refresh(name);
      }, 350);
    });
  }
  channel = ch.subscribe();
}

export function stopRealtime(db: SupabaseClient) {
  clearTimeout(timer);
  dirty.clear();
  if (channel) void db.removeChannel(channel);
  channel = null;
}
