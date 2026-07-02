import type { JsonLdModuleId } from "@/lib/seo/json-ld/types";

/**
 * Feature flags for optional JSON-LD modules.
 * Author (E-E-A-T) and HowTo are implemented but off by default —
 * enable per-module when ready to ship.
 */
export const JSON_LD_MODULE_FLAGS: Record<JsonLdModuleId, boolean> = {
  article: true,
  breadcrumb: true,
  faq: true,
  author: true,
  howto: false,
};

export function isJsonLdModuleEnabled(id: JsonLdModuleId): boolean {
  return JSON_LD_MODULE_FLAGS[id] ?? false;
}
