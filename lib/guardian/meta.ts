/**
 * Render Guardian — blog post metadata builder (Phase 2 / 6-A).
 * @see lib/guardian/PHASE2_PLAN.md
 */

import type { Metadata } from "next";
import { locales, ogLocales } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import { getPostSlugs } from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import type { BlogPostGuardianInput } from "@/lib/guardian/types";

export function buildBlogPostMetadata(
  input: BlogPostGuardianInput,
): Metadata {
  const { locale, slug, post } = input;
  const url = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;
  const ogImage = post.coverImage
    ? `${siteConfig.url}${post.coverImage}`
    : undefined;
  const publishedIso = post.publishedAt ?? post.date;
  const modifiedIso = post.updatedAt ?? publishedIso;

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      locale: ogLocales[locale],
      publishedTime: publishedIso,
      modifiedTime: modifiedIso,
      tags: post.tags,
      authors: [siteConfig.author],
      ...(ogImage ? { images: [{ url: ogImage, alt: post.coverImageAlt }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales
          .filter((l) => getPostSlugs(l).includes(slug))
          .map((l) => [
            l,
            `${siteConfig.url}${localizedPath(l, `/blog/${slug}`)}`,
          ]),
      ),
    },
  };
}
