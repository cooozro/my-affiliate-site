import { siteConfig } from "@/lib/site";
import type { JsonLdBuildContext, JsonLdThing } from "@/lib/seo/json-ld/types";

/**
 * Optional E-E-A-T author graph (disabled by default via config).
 * Enable JSON_LD_MODULE_FLAGS.author when ready to surface Person/Organization links.
 */
export const organizationId = `${siteConfig.url}/#organization`;

export function buildAuthorJsonLd(ctx: JsonLdBuildContext): JsonLdThing {
  const aboutUrl = `${siteConfig.url}/${ctx.locale}/about`;
  const contactUrl = `${siteConfig.url}/${ctx.locale}/contact`;

  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.author,
    alternateName: siteConfig.name,
    description: siteConfig.description,
    url: aboutUrl,
    sameAs: [aboutUrl, contactUrl],
  };
}
