import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const FORBIDDEN = [
  /<!--\s*ad-break\s*-->/i,
  /adsense/i,
  /googlesyndication/i,
];

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
  const issues = [];

  for (const locale of ["en", "ko"]) {
    const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) {
      issues.push(`${slug}/${locale}.md missing`);
      continue;
    }

    const { data, content, raw } = readPost(slug, locale);

    if (!data.title?.trim()) issues.push(`${locale}: missing title`);
    if (!data.description || data.description.length < 50) {
      issues.push(`${locale}: description too short`);
    }
    if (content.length < 800) {
      issues.push(`${locale}: body too short (${content.length})`);
    }
    if (!data.coverImage) issues.push(`${locale}: missing coverImage`);
    if (data.coverImage && !data.coverImageAlt) {
      issues.push(`${locale}: missing coverImageAlt`);
    }

    for (const pattern of FORBIDDEN) {
      if (pattern.test(raw)) issues.push(`${locale}: forbidden pattern`);
    }
  }

  return issues;
}
