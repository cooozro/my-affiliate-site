import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Locale } from "@/lib/i18n/config";

const POSTS_DIRECTORY = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags?: string[];
  coverImage?: string;
  draft?: boolean;
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

function parseLocalizedField(
  data: Record<string, unknown>,
  field: "title" | "description",
  locale: Locale,
): string {
  const value = data[field];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = value as Record<string, string>;
    return String(map[locale] ?? map.en ?? map.ko ?? "");
  }

  const localeOverride = data[`${field}_${locale}`];
  if (localeOverride) {
    return String(localeOverride);
  }

  return String(value ?? "");
}

function localizePostMeta(
  slug: string,
  data: Record<string, unknown>,
  locale: Locale,
): PostMeta {
  return {
    slug,
    title: parseLocalizedField(data, "title", locale),
    description: parseLocalizedField(data, "description", locale),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    coverImage: data.coverImage ? String(data.coverImage) : undefined,
    draft: Boolean(data.draft),
  };
}

function parsePostFile(slug: string, locale: Locale = "en"): Post {
  const filePath = path.join(POSTS_DIRECTORY, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    ...localizePostMeta(slug, data as Record<string, unknown>, locale),
    content: content.trim(),
  };
}

export function getPostSlugs(options?: { includeDrafts?: boolean }): string[] {
  ensurePostsDirectory();
  const includeDrafts = options?.includeDrafts ?? false;

  return fs
    .readdirSync(POSTS_DIRECTORY)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .filter((slug) => {
      if (includeDrafts) return true;
      const post = parsePostFile(slug);
      return !post.draft;
    });
}

export function getAllPosts(
  locale: Locale = "en",
  options?: { includeDrafts?: boolean },
): PostMeta[] {
  return getPostSlugs(options)
    .map((slug) => {
      const { content: _content, ...meta } = parsePostFile(slug, locale);
      return meta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

const AD_BREAK_MARKER = "<!-- ad-break -->";

export function splitContentForAds(content: string): {
  beforeAd: string;
  afterAd: string;
} {
  if (content.includes(AD_BREAK_MARKER)) {
    const [beforeAd, afterAd] = content.split(AD_BREAK_MARKER);
    return { beforeAd: beforeAd.trim(), afterAd: (afterAd ?? "").trim() };
  }

  const blocks = content.split(/\n\n+/);
  if (blocks.length < 4) {
    return { beforeAd: content, afterAd: "" };
  }

  const midpoint = Math.ceil(blocks.length / 2);
  return {
    beforeAd: blocks.slice(0, midpoint).join("\n\n"),
    afterAd: blocks.slice(midpoint).join("\n\n"),
  };
}
