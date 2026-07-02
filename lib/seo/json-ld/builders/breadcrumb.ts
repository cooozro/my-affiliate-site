import type { JsonLdBuildContext, JsonLdThing } from "@/lib/seo/json-ld/types";

export function buildBreadcrumbJsonLd(ctx: JsonLdBuildContext): JsonLdThing {
  return {
    "@type": "BreadcrumbList",
    "@id": `${ctx.url}#breadcrumb`,
    itemListElement: ctx.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
