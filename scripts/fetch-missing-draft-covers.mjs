#!/usr/bin/env node
/**
 * Fetch cover images for draft posts that lack coverImage in frontmatter.
 * Used on GHA where PEXELS_API_KEY / PIXABAY_API_KEY live in Secrets.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function listDraftSlugsMissingCover() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const slugs = [];
  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    const koPath = path.join(POSTS_DIR, slug, "ko.md");
    if (!fs.existsSync(enPath) || !fs.existsSync(koPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.draft) continue;
    if (data.coverImage) continue;
    if (slug === "adsense-seo-checklist" || slug === "aipick-seo-precision-report") {
      continue;
    }

    slugs.push(slug);
  }

  return slugs.sort();
}

function defaultQuery(slug) {
  const enPath = path.join(POSTS_DIR, slug, "en.md");
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  const keywords = data.imageSearchKeywords;
  if (Array.isArray(keywords) && keywords[0]) return String(keywords[0]);
  return slug.replace(/-/g, " ");
}

const missing = listDraftSlugsMissingCover();

if (missing.length === 0) {
  console.log("No draft posts missing coverImage.");
  process.exit(0);
}

console.log(`Fetching covers for ${missing.length} draft(s): ${missing.join(", ")}`);

for (const slug of missing) {
  const query = defaultQuery(slug);
  console.log(`\n→ ${slug} (query: ${query})`);
  execSync(
    `node scripts/fetch-cover-image.mjs --slug=${slug} --query=${JSON.stringify(query)} --locale=all`,
    { stdio: "inherit", env: process.env },
  );
}

console.log("\nDone.");
