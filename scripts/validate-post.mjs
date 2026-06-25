#!/usr/bin/env node
/**
 * Validate blog posts against AdSense-safe, SEO-friendly content standards.
 *
 * Usage: npm run content:validate
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content", "posts");

const FORBIDDEN_PATTERNS = [
  /<!--\s*ad-break\s*-->/i,
  /adsense/i,
  /googlesyndication/i,
  /placeholder.*ad/i,
];

const REQUIRED_LOCALES = ["en", "ko"];

function listSlugDirs() {
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function hasImage(slug, data, body) {
  if (data.coverImage) {
    const imagePath = path.join(ROOT, "public", data.coverImage);
    if (fs.existsSync(imagePath)) {
      return true;
    }
  }

  return /!\[[^\]]*\]\([^)]+\)/.test(body);
}

function validatePost(slug, locale) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  const issues = [];

  if (!fs.existsSync(filePath)) {
    return [`${slug}/${locale}.md: missing file`];
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  if (data.draft) {
    return [];
  }

  if (!data.title?.trim()) issues.push("missing title");
  if (!data.description?.trim()) {
    issues.push("missing description");
  } else if (data.description.trim().length < 50) {
    issues.push("description under 50 chars");
  }
  if (!data.date) issues.push("missing date");

  const body = content.trim();
  if (body.length < 800) {
    issues.push(`body too short (${body.length} chars, min 800)`);
  }

  if (!hasImage(slug, data, body)) {
    issues.push("no cover image or inline image");
  }

  if (!data.coverImageAlt && data.coverImage) {
    issues.push("coverImageAlt required when coverImage is set");
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(raw)) {
      issues.push(`forbidden pattern: ${pattern}`);
    }
  }

  if (issues.length === 0) {
    return [];
  }

  return issues.map((issue) => `${slug}/${locale}.md: ${issue}`);
}

function main() {
  const allIssues = [];

  for (const slug of listSlugDirs()) {
    const localeFiles = REQUIRED_LOCALES.map((locale) => ({
      locale,
      path: path.join(POSTS_DIR, slug, `${locale}.md`),
    }));

    const publishedLocales = localeFiles.filter(({ path: filePath }) => {
      if (!fs.existsSync(filePath)) return false;
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      return !data.draft;
    });

    for (const { locale, path: filePath } of localeFiles) {
      if (!fs.existsSync(filePath)) {
        if (publishedLocales.length > 0) {
          allIssues.push(`${slug}/${locale}.md: missing locale file`);
        }
        continue;
      }

      allIssues.push(...validatePost(slug, locale));
    }
  }

  if (allIssues.length > 0) {
    console.error("Content validation failed:\n");
    for (const issue of allIssues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log("All published posts passed content validation.");
}

main();
