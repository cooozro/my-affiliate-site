import { organizationId } from "@/lib/seo/json-ld/builders/author";
import { siteConfig } from "@/lib/site";
import type { JsonLdBuildContext, JsonLdThing } from "@/lib/seo/json-ld/types";

export function buildArticleJsonLd(ctx: JsonLdBuildContext): JsonLdThing {
  const published = ctx.datePublished;
  const modified = ctx.dateModified;

  const article: JsonLdThing = {
    "@type": "BlogPosting",
    "@id": `${ctx.url}#article`,
    headline: ctx.title,
    description: ctx.description,
    datePublished: published,
    dateModified: modified,
    inLanguage: ctx.locale === "ko" ? "ko-KR" : "en-US",
    author: { "@id": organizationId },
    publisher: { "@id": organizationId },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": ctx.url,
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  if (ctx.imageUrl) {
    article.image = [ctx.imageUrl];
  }

  if (ctx.tags && ctx.tags.length > 0) {
    article.keywords = ctx.tags.join(", ");
  }

  return article;
}
