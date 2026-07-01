#!/usr/bin/env node
/**
 * Batch refresh cover images with vision + enhanced search.
 *
 * By default only touches DRAFT posts — published covers are preserved unless
 * you pass an explicit --slug=... or --include-published.
 *
 * Usage:
 *   node scripts/refresh-post-covers.mjs
 *   node scripts/refresh-post-covers.mjs --drafts-only
 *   node scripts/refresh-post-covers.mjs --slug=2026-my-draft-slug
 *   node scripts/refresh-post-covers.mjs --include-published --slug=2026-air-purifiers-guide
 *
 * Env: PEXELS_API_KEY, PIXABAY_API_KEY, OPENAI_API_KEY (vision)
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  availableImageProviders,
  clearSlugCoverAssets,
  fetchCoverImage,
} from "./lib/cover-image.mjs";
import { buildCoverAlts, resolveImageContext } from "./lib/image-query.mjs";
import { isPublishedSlug } from "./lib/automation-guard.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function readPost(slug, locale) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content, filePath };
}

function writePost(slug, locale, data, content) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
}

function listDraftSlugs() {
  const slugs = [];
  if (!fs.existsSync(POSTS_DIR)) return slugs;

  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const en = readPost(entry.name, "en");
    if (en?.data?.draft) slugs.push(entry.name);
  }

  return slugs.sort();
}

function parseArgs(argv) {
  const slugs = [];
  let includePublished = false;

  for (const arg of argv) {
    if (arg.startsWith("--slug=")) slugs.push(arg.slice(7));
    if (arg === "--include-published") includePublished = true;
    if (arg === "--drafts-only") includePublished = false;
  }

  if (slugs.length > 0) {
    return { slugs, includePublished };
  }

  return { slugs: listDraftSlugs(), includePublished: false };
}

async function refreshSlug(slug, { includePublished }) {
  if (!includePublished && isPublishedSlug(slug)) {
    console.log(`Skip ${slug}: published (pass --include-published to override)`);
    return false;
  }

  const en = readPost(slug, "en");
  if (!en) {
    console.warn(`Skip ${slug}: en.md missing`);
    return false;
  }

  console.log(`\n=== ${slug} ===`);
  clearSlugCoverAssets(slug, en.data.coverImage);

  const imageInput = {
    title: en.data.title,
    tags: en.data.tags,
    imageSearchKeywords: en.data.imageSearchKeywords,
    imageQuery: en.data.imageQuery,
    topicCluster: en.data.topicCluster,
    coverImage: en.data.coverImage,
  };

  const meta = await fetchCoverImage(slug, imageInput, { forceRefresh: true });
  if (!meta) {
    console.error(`FAILED: ${slug}`);
    return false;
  }

  const ctx = resolveImageContext(slug, imageInput);
  const alts = buildCoverAlts(ctx);

  for (const locale of ["en", "ko"]) {
    const post = readPost(slug, locale);
    if (!post) continue;

    const next = {
      ...post.data,
      coverImage: meta.coverImage,
      coverImageAlt: locale === "ko" ? alts.ko : alts.en,
      coverImageCredit: meta.coverImageCredit,
      coverImageProvider: meta.coverImageProvider,
      coverImageAssetId: meta.coverImageAssetId,
      coverImageSourceUrl: meta.coverImageSourceUrl,
      ...(meta.imageSearchKeywords
        ? { imageSearchKeywords: meta.imageSearchKeywords }
        : {}),
    };

    if (locale === "en") {
      next.coverImageAltKo = alts.ko;
    } else {
      next.coverImageAltKo = alts.ko;
    }

    writePost(slug, locale, next, post.content);
    console.log(`Updated ${slug}/${locale}.md → ${meta.coverImage}`);
  }

  return true;
}

async function main() {
  loadEnvLocal();
  if (availableImageProviders().length === 0) {
    console.error("Set PEXELS_API_KEY and/or PIXABAY_API_KEY in .env.local");
    process.exit(1);
  }

  const { slugs, includePublished } = parseArgs(process.argv.slice(2));

  if (slugs.length === 0) {
    console.log("No draft slugs to refresh. Pass --slug=... for a specific post.");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const slug of slugs) {
    const success = await refreshSlug(slug, { includePublished });
    if (success) ok += 1;
    else fail += 1;
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed/skipped`);
  if (fail > 0 && ok === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
