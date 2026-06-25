import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIRECTORY = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags?: string[];
  coverImage?: string;
};

export type Post = PostMeta & {
  content: string;
};

function ensurePostsDirectory(): void {
  if (!fs.existsSync(POSTS_DIRECTORY)) {
    throw new Error(
      `content/posts 폴더를 찾을 수 없습니다: ${POSTS_DIRECTORY}`,
    );
  }
}

function parsePostFile(slug: string): Post {
  const filePath = path.join(POSTS_DIRECTORY, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`포스트 파일을 찾을 수 없습니다: ${filePath}`);
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
    content: content.trim(),
  };
}

export function getPostSlugs(): string[] {
  ensurePostsDirectory();

  return fs
    .readdirSync(POSTS_DIRECTORY)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => {
      const { content: _content, ...meta } = parsePostFile(slug);
      return meta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post {
  return parsePostFile(slug);
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
