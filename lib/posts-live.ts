/**
 * Public post reads that prefer GitHub on Vercel.
 * Deploy bundles lag behind admin publish commits (and content-only builds
 * may be skipped), so homepage / blog must not rely only on the FS snapshot.
 */
import "server-only";

import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/i18n/config";
import { listGithubDirectory, readGithubFile } from "@/lib/admin-services";
import {
  getHomePosts,
  getPostBySlug,
  isNoindexFrontmatter,
  isPublicListPost,
  postPublishedIso,
  type HomePost,
  type Post,
} from "@/lib/posts";
import { usesRemotePostStore } from "@/lib/posts-admin";

export const AIPICK_POSTS_CACHE_TAG = "aipick-posts";

function postFromMarkdown(slug: string, raw: string): Post {
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
    noindex: isNoindexFrontmatter(data as Record<string, unknown>),
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    contentProfile: data.contentProfile
      ? (String(data.contentProfile) as Post["contentProfile"])
      : undefined,
    manualOrigin:
      data.manualOrigin === true ||
      data.manualOrigin === "true" ||
      data.writingProvider === "manual",
    writingProvider: data.writingProvider
      ? String(data.writingProvider)
      : undefined,
    content: content.trim(),
  };
}

function stripMarkdownForSearch(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchText(post: Post, sibling?: Post): string {
  const chunks: string[] = [
    post.title,
    post.description,
    ...(post.tags ?? []),
    stripMarkdownForSearch(post.content),
    post.slug.replace(/-/g, " "),
  ];
  if (sibling) {
    chunks.push(
      sibling.title,
      sibling.description,
      ...(sibling.tags ?? []),
      stripMarkdownForSearch(sibling.content),
    );
  }
  return chunks.filter(Boolean).join(" ").toLowerCase();
}

function sortByPublished(a: HomePost, b: HomePost) {
  const ta = new Date(postPublishedIso(a)).getTime();
  const tb = new Date(postPublishedIso(b)).getTime();
  const diff = (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  if (diff !== 0) return diff;
  return b.slug.localeCompare(a.slug);
}

async function readGithubPost(
  slug: string,
  locale: Locale,
): Promise<Post | null> {
  try {
    const { content } = await readGithubFile(
      `content/posts/${slug}/${locale}.md`,
    );
    return postFromMarkdown(slug, content);
  } catch {
    return null;
  }
}

async function listGithubPostSlugs(): Promise<string[]> {
  const entries = await listGithubDirectory("content/posts");
  return entries
    .filter((entry) => entry.type === "dir")
    .map((entry) => entry.name ?? entry.path.split("/").pop() ?? "")
    .filter(Boolean);
}

async function loadHomePostsFromGithub(locale: Locale): Promise<HomePost[]> {
  const otherLocale: Locale = locale === "en" ? "ko" : "en";
  const slugs = await listGithubPostSlugs();
  const rows: HomePost[] = [];
  const batchSize = 8;

  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    const built = await Promise.all(
      batch.map(async (slug) => {
        const post = await readGithubPost(slug, locale);
        if (!post || !isPublicListPost(post)) return null;
        const sibling = await readGithubPost(slug, otherLocale);
        const { content: _c, ...meta } = post;
        return {
          ...meta,
          searchText: buildSearchText(post, sibling ?? undefined),
        } satisfies HomePost;
      }),
    );
    for (const row of built) {
      if (row) rows.push(row);
    }
  }

  return rows.sort(sortByPublished);
}

const cachedHomePosts = unstable_cache(
  async (locale: Locale) => loadHomePostsFromGithub(locale),
  ["aipick-home-posts-github"],
  { revalidate: 60, tags: [AIPICK_POSTS_CACHE_TAG] },
);

const cachedGithubPost = unstable_cache(
  async (slug: string, locale: Locale, includeDrafts: boolean) => {
    const post = await readGithubPost(slug, locale);
    if (!post) return null;
    if (post.draft && !includeDrafts) return null;
    return post;
  },
  ["aipick-post-github"],
  { revalidate: 60, tags: [AIPICK_POSTS_CACHE_TAG] },
);

function canUseGithub(): boolean {
  return usesRemotePostStore() && Boolean(process.env.GITHUB_TOKEN?.trim());
}

/** Homepage list — GitHub first on Vercel, FS fallback. */
export async function getHomePostsLive(locale: Locale): Promise<HomePost[]> {
  if (canUseGithub()) {
    try {
      return await cachedHomePosts(locale);
    } catch (error) {
      console.error(
        "getHomePostsLive GitHub failed; using deploy bundle:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return getHomePosts(locale);
}

/** Public blog post — GitHub first on Vercel so newly published slugs resolve. */
export async function getPostBySlugLive(
  slug: string,
  options?: { includeDrafts?: boolean; locale?: Locale },
): Promise<Post> {
  const locale = options?.locale ?? "en";
  const includeDrafts = options?.includeDrafts ?? false;

  if (canUseGithub()) {
    try {
      const remote = await cachedGithubPost(slug, locale, includeDrafts);
      if (remote) return remote;
    } catch (error) {
      console.error(
        "getPostBySlugLive GitHub failed; using deploy bundle:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return getPostBySlug(slug, { locale, includeDrafts });
}
