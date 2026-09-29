import "server-only";

import matter from "gray-matter";
import type { Locale } from "@/lib/i18n/config";
import { readGithubFile } from "@/lib/admin-services";
import { getPostBySlug, type Post } from "@/lib/posts";
import { usesRemotePostStore } from "@/lib/posts-admin";

function parseMarkdown(slug: string, raw: string): Post {
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    coverImage: data.coverImage ? String(data.coverImage) : undefined,
    coverImageAlt: data.coverImageAlt ? String(data.coverImageAlt) : undefined,
    coverImageCredit: data.coverImageCredit
      ? String(data.coverImageCredit)
      : undefined,
    coverImageProvider: data.coverImageProvider
      ? String(data.coverImageProvider)
      : undefined,
    coverImageSourceUrl: data.coverImageSourceUrl
      ? String(data.coverImageSourceUrl)
      : undefined,
    liveData: Boolean(data.liveData),
    draft: Boolean(data.draft),
    noindex:
      data.noindex === true ||
      data.noindex === "true" ||
      /\bnoindex\b/i.test(String(data.robots ?? "")),
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    contentProfile: data.contentProfile
      ? (String(data.contentProfile) as Post["contentProfile"])
      : undefined,
    content: content.trim(),
  };
}

/**
 * Admin preview must see the post immediately after GitHub save,
 * even before the next Vercel deploy finishes bundling content/posts.
 */
export async function getAdminPreviewPost(
  slug: string,
  locale: Locale,
): Promise<Post> {
  try {
    return getPostBySlug(slug, { locale, includeDrafts: true });
  } catch (localError) {
    if (!(usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim())) {
      throw localError;
    }
    try {
      const { content } = await readGithubFile(
        `content/posts/${slug}/${locale}.md`,
      );
      const post = parseMarkdown(slug, content);
      if (post.draft === false) return post;
      return post;
    } catch {
      throw localError;
    }
  }
}
