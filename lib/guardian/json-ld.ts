/**
 * Render Guardian — JSON-LD public API.
 * Wraps lib/seo/json-ld; builders remain internal.
 */

import type { BlogPostGuardianInput } from "@/lib/guardian/types";
import { siteConfig } from "@/lib/site";
import {
  buildBlogPostBreadcrumbs,
  buildBlogPostJsonLdGraph,
} from "@/lib/seo/json-ld/compose";

export {
  buildBlogPostBreadcrumbs,
  buildBlogPostJsonLdGraph,
};

export type {
  BlogPostJsonLdInput,
  BreadcrumbItem,
  JsonLdThing,
} from "@/lib/seo/json-ld/types";

/** Build JSON-LD graph for a blog post page (single entry point). */
export function buildBlogPostPageJsonLd(
  input: BlogPostGuardianInput & { pageUrl: string },
) {
  const { locale, slug, post, breadcrumbLabels, pageUrl } = input;
  if (!breadcrumbLabels) {
    throw new Error("buildBlogPostPageJsonLd requires breadcrumbLabels");
  }

  const publishedIso = post.publishedAt ?? post.date;
  const modifiedIso = post.updatedAt ?? publishedIso;
  const imageUrl = post.coverImage
    ? `${siteConfig.url}${post.coverImage}`
    : undefined;

  return buildBlogPostJsonLdGraph({
    locale,
    slug,
    title: post.title,
    description: post.description,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    url: pageUrl,
    imageUrl,
    tags: post.tags,
    content: post.content,
    contentProfile: post.contentProfile,
    breadcrumbs: buildBlogPostBreadcrumbs(locale, post.title, slug, breadcrumbLabels),
  });
}
