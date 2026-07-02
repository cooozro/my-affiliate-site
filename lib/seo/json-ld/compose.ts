import { extractFaqFromMarkdown } from "@/lib/seo/faq-extract";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import { siteConfig } from "@/lib/site";
import { isJsonLdModuleEnabled } from "@/lib/seo/json-ld/config";
import { buildArticleJsonLd } from "@/lib/seo/json-ld/builders/article";
import { buildAuthorJsonLd } from "@/lib/seo/json-ld/builders/author";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld/builders/breadcrumb";
import { buildFaqJsonLd } from "@/lib/seo/json-ld/builders/faq";
import { buildHowToJsonLd } from "@/lib/seo/json-ld/builders/howto";
import type {
  BlogPostJsonLdInput,
  JsonLdBuildContext,
  JsonLdModuleConfig,
  JsonLdThing,
} from "@/lib/seo/json-ld/types";

const MODULES: JsonLdModuleConfig[] = [
  { id: "article", enabled: true, builder: buildArticleJsonLd },
  { id: "breadcrumb", enabled: true, builder: buildBreadcrumbJsonLd },
  { id: "faq", enabled: true, builder: buildFaqJsonLd },
  { id: "author", enabled: true, builder: buildAuthorJsonLd },
  { id: "howto", enabled: true, builder: buildHowToJsonLd },
];

function toIsoDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

export function buildBlogPostBreadcrumbs(
  locale: Locale,
  title: string,
  slug: string,
  labels: { home: string; articles: string },
) {
  const homeUrl = `${siteConfig.url}${localizedPath(locale)}`;
  const articleUrl = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;

  return [
    { name: labels.home, url: homeUrl },
    { name: labels.articles, url: homeUrl },
    { name: title, url: articleUrl },
  ];
}

export function buildBlogPostJsonLdGraph(
  input: BlogPostJsonLdInput,
): JsonLdThing {
  const ctx: JsonLdBuildContext = {
    ...input,
    datePublished: toIsoDate(input.datePublished),
    dateModified: toIsoDate(input.dateModified),
    faqItems: extractFaqFromMarkdown(input.content),
  };

  const graph: JsonLdThing[] = [];

  for (const mod of MODULES) {
    if (!isJsonLdModuleEnabled(mod.id)) continue;

    const built = mod.builder(ctx);
    if (!built) continue;

    if (Array.isArray(built)) {
      graph.push(...built);
    } else {
      graph.push(built);
    }
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
