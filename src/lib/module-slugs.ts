/** Rutas válidas de /intranet/modulos/[mod] (archivo sin código de cliente, usable desde el servidor). */
export const MODULE_SLUGS = ["planes", "inventario", "finanzas", "servicios", "mensajes", "reportes", "configuracion"] as const;
export type ModuleSlug = (typeof MODULE_SLUGS)[number];
export const isModuleSlug = (s: string): s is ModuleSlug => (MODULE_SLUGS as readonly string[]).includes(s);
