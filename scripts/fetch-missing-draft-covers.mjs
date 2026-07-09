#!/usr/bin/env node
/**
 * Fetch cover images for draft posts that lack coverImage in frontmatter.
 * Used on GHA where PEXELS_API_KEY / PIXABAY_API_KEY live in Secrets.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
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

if (!process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) {
  console.error("Missing PEXELS_API_KEY and PIXABAY_API_KEY in environment.");
  process.exit(1);
}

console.log(`Fetching covers for ${missing.length} draft(s): ${missing.join(", ")}`);

let failed = false;

for (const slug of missing) {
  const query = defaultQuery(slug);
  console.log(`\n→ ${slug} (query: ${query})`);
  const result = spawnSync(
    process.execPath,
    [
      "scripts/fetch-cover-image.mjs",
      `--slug=${slug}`,
      `--query=${query}`,
      "--locale=all",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    failed = true;
    console.error(`Failed to fetch cover for ${slug}`);
  }
}

if (failed) process.exit(1);

console.log("\nDone.");
