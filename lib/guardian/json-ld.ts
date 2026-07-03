/**
 * Render Guardian — JSON-LD public API.
 * Wraps lib/seo/json-ld; builders remain internal until Phase 2 step 2.
 */

export {
  buildBlogPostBreadcrumbs,
  buildBlogPostJsonLdGraph,
} from "@/lib/seo/json-ld/compose";

export type {
  BlogPostJsonLdInput,
  BreadcrumbItem,
  JsonLdThing,
} from "@/lib/seo/json-ld/types";
