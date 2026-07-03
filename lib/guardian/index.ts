/**
 * Render Guardian — public API (Phase 2).
 *
 * Import blog metadata, JSON-LD, article chrome rules, and publication copy
 * only from this module (or deprecated shims).
 *
 * Before changing files here: update GUARDIAN_CHANGELOG.md and get owner approval.
 */

export type {
  BlogPostGuardianInput,
  ArticleSharePlacement,
  TaglinePlacement,
  ArticleChromeRules,
} from "@/lib/guardian/types";

export { buildBlogPostMetadata } from "@/lib/guardian/meta";

export {
  buildBlogPostBreadcrumbs,
  buildBlogPostJsonLdGraph,
} from "@/lib/guardian/json-ld";

export type {
  BlogPostJsonLdInput,
  BreadcrumbItem,
  JsonLdThing,
} from "@/lib/guardian/json-ld";

export {
  ARTICLE_CHROME_RULES,
  splitArticleBodyForTagline,
  assertTaglinePlacement,
} from "@/lib/guardian/article-chrome";

export type { RelatedGuidesSplit } from "@/lib/guardian/article-chrome";

export {
  publicationTagline,
  getPublicationTagline,
} from "@/lib/guardian/publication-copy";
