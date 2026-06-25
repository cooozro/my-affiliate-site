import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { auditPostForPublish } from "../lib/content-quality.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export function listSlugDirs() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function readPost(slug, locale) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content: content.trim(), raw, filePath };
}

export function writePost(slug, locale, data, content) {
  const dir = path.join(POSTS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
  return filePath;
}

export function slugExists(slug) {
  return fs.existsSync(path.join(POSTS_DIR, slug));
}

export function listDrafts() {
  const slugs = listSlugDirs();
  const drafts = [];

  for (const slug of slugs) {
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    const koPath = path.join(POSTS_DIR, slug, "ko.md");
    if (!fs.existsSync(enPath) || !fs.existsSync(koPath)) continue;

    const en = readPost(slug, "en");
    if (!en.data.draft) continue;

    drafts.push({
      slug,
      createdAt: en.data.createdAt ?? fs.statSync(enPath).mtime.toISOString(),
      title: en.data.title,
    });
  }

  return drafts.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function countDrafts() {
  return listDrafts().length;
}

export function validatePostFiles(slug) {
  const root = process.cwd();
  const issues = auditPostForPublish(root, slug);

  if (issues.length > 0) {
    console.error(`Google content self-audit failed for ${slug}:`);
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
  } else {
    console.log(`Google content self-audit passed for ${slug} (publish-ready).`);
  }

  return issues;
}
