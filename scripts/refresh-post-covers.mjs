#!/usr/bin/env node
/**
 * Batch refresh cover images with vision + enhanced search.
 *
 * Usage:
 *   node scripts/refresh-post-covers.mjs
 *   node scripts/refresh-post-covers.mjs --slug=2026-air-purifiers-guide
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
import { buildCoverAlt } from "./lib/image-query.mjs";

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

const DEFAULT_SLUGS = [
  "2026-air-purifiers-guide",
  "2026-power-banks-guide",
  "2026-budget-power-banks-guide",
  "2026-portable-vs-window-ac-head-to-head",
  "2026-budget-mechanical-keyboards-guide",
  "2026-budget-smartphones-under-300",
  "2026-budget-wireless-earbuds-top5",
  "2026-dehumidifiers-guide",
];

function parseArgs(argv) {
  const slugs = [];
  for (const arg of argv) {
    if (arg.startsWith("--slug=")) slugs.push(arg.slice(7));
  }
  return slugs.length > 0 ? slugs : DEFAULT_SLUGS;
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

async function refreshSlug(slug) {
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

  const ctx = {
    productKeywords: meta.imageSearchKeywords ?? en.data.imageSearchKeywords ?? [],
    title: en.data.title,
  };

  for (const locale of ["en", "ko"]) {
    const post = readPost(slug, locale);
    if (!post) continue;

    const next = {
      ...post.data,
      coverImage: meta.coverImage,
      coverImageAlt: buildCoverAlt(locale === "ko" ? "ko" : "en", {
        ...ctx,
        productKeywords: meta.imageSearchKeywords ?? ctx.productKeywords,
        title: post.data.title ?? en.data.title,
      }),
      coverImageCredit: meta.coverImageCredit,
      coverImageProvider: meta.coverImageProvider,
      coverImageAssetId: meta.coverImageAssetId,
      coverImageSourceUrl: meta.coverImageSourceUrl,
      ...(meta.imageSearchKeywords
        ? { imageSearchKeywords: meta.imageSearchKeywords }
        : {}),
    };

    if (locale === "en" && meta.coverImageAltKo) {
      next.coverImageAltKo = meta.coverImageAltKo;
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

  const slugs = parseArgs(process.argv.slice(2));
  let ok = 0;
  let fail = 0;

  for (const slug of slugs) {
    const success = await refreshSlug(slug);
    if (success) ok += 1;
    else fail += 1;
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
