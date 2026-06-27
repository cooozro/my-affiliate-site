import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { locales, type Locale } from "@/lib/i18n/config";

const POSTS_DIRECTORY = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags?: string[];
  coverImage?: string;
  coverImageAlt?: string;
  coverImageCredit?: string;
  liveData?: boolean;
  draft?: boolean;
  publishedAt?: string;
  contentProfile?:
    | "buying-guide"
    | "head-to-head"
    | "scenario-guide"
    | "explainer"
    | "checklist"
    | "editorial";
};

export type Post = PostMeta & {
  content: string;
};

function ensurePostsDirectory(): void {
  if (!fs.existsSync(POSTS_DIRECTORY)) {
    throw new Error(
      `content/posts folder not found: ${POSTS_DIRECTORY}`,
    );
  }
}

function getPostFilePath(slug: string, locale: Locale): string {
  return path.join(POSTS_DIRECTORY, slug, `${locale}.md`);
}

function parsePostFile(slug: string, locale: Locale): Post {
  const filePath = getPostFilePath(slug, locale);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
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
    liveData: Boolean(data.liveData),
    draft: Boolean(data.draft),
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    contentProfile: data.contentProfile
      ? String(data.contentProfile)
      : undefined,
    content: content.trim(),
  };
}

function getAllSlugDirs(): string[] {
  ensurePostsDirectory();

  return fs
    .readdirSync(POSTS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function getPostSlugs(
  locale: Locale,
  options?: { includeDrafts?: boolean },
): string[] {
  const includeDrafts = options?.includeDrafts ?? false;

  return getAllSlugDirs().filter((slug) => {
    const filePath = getPostFilePath(slug, locale);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    if (includeDrafts) {
      return true;
    }

    return !parsePostFile(slug, locale).draft;
  });
}

function postSortTime(meta: PostMeta): number {
  const iso = meta.publishedAt ?? meta.updatedAt ?? meta.date;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function getAllPosts(
  locale: Locale,
  options?: { includeDrafts?: boolean },
): PostMeta[] {
  return getPostSlugs(locale, options)
    .map((slug) => {
      const { content: _content, ...meta } = parsePostFile(slug, locale);
      return meta;
    })
    .sort((a, b) => postSortTime(b) - postSortTime(a));
}

export function getPostBySlug(
  slug: string,
  options?: { includeDrafts?: boolean; locale?: Locale },
): Post {
  const locale = options?.locale ?? "en";
  const post = parsePostFile(slug, locale);

  if (post.draft && !options?.includeDrafts) {
    throw new Error(`Draft post is not publicly accessible: ${slug}`);
  }

  return post;
}

export function getAllStaticBlogParams(): { locale: Locale; slug: string }[] {
  return locales.flatMap((locale) =>
    getPostSlugs(locale).map((slug) => ({ locale, slug })),
  );
}
