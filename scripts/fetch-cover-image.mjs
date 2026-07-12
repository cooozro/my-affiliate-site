#!/usr/bin/env node
/**
 * Fetch a royalty-free cover image (Pexels + Pixabay rotation) and update post frontmatter.
 *
 * Usage:
 *   npm run content:image -- --slug=my-post
 *   npm run content:image -- --slug=my-post --query="override search" [--force]
 *
 * Env: PEXELS_API_KEY and/or PIXABAY_API_KEY in .env.local
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  availableImageProviders,
  fetchCoverImage,
  pickImageProvider,
} from "./lib/cover-image.mjs";
import { buildCoverAlts, resolveImageContext } from "./lib/image-query.mjs";
import { ensureImageApiEnv, printImageApiKeyHelp } from "./lib/image-api-env.mjs";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content", "posts");

function parseArgs(argv) {
  const args = { slug: "", query: "", locale: "all", provider: "", force: false };

  for (const arg of argv) {
    if (arg.startsWith("--slug=")) args.slug = arg.slice(7);
    if (arg.startsWith("--query=")) args.query = arg.slice(8);
    if (arg.startsWith("--locale=")) args.locale = arg.slice(9);
    if (arg.startsWith("--provider=")) args.provider = arg.slice(11);
    if (arg === "--force") args.force = true;
  }

  return args;
}

function readPostMeta(slug, locale = "en") {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;
  const { data } = matter(fs.readFileSync(filePath, "utf8"));
  return data;
}

function updateFrontmatter(slug, locale, fields) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const next = { ...data, ...fields };
  fs.writeFileSync(filePath, matter.stringify(content, next), "utf8");
  return filePath;
}

function coverAlreadyExists(slug, coverImage) {
  if (coverImage?.startsWith("/images/posts/")) {
    const filePath = path.join(ROOT, "public", coverImage);
    if (fs.existsSync(filePath)) return true;
  }

  const dir = path.join(ROOT, "public", "images", "posts", slug);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((name) => /\.(jpe?g|webp|png)$/i.test(name));
}

async function main() {
  ensureImageApiEnv();
  const { slug, query, locale, provider, force } = parseArgs(process.argv.slice(2));

  if (!slug) {
    console.error(
      'Usage: npm run content:image -- --slug=post-slug [--query="search terms"] [--force] [--provider=pexels|pixabay]',
    );
    process.exit(1);
  }

  if (availableImageProviders().length === 0) {
    printImageApiKeyHelp();
    process.exit(1);
  }

  const enMeta = readPostMeta(slug, "en");
  if (!enMeta) {
    console.error(`Post not found: content/posts/${slug}/en.md`);
    process.exit(1);
  }

  if (!force && coverAlreadyExists(slug, enMeta.coverImage)) {
    console.log(`Cover already exists for ${slug} — use --force to replace`);
    process.exit(0);
  }

  if (force) {
    const { clearSlugCoverAssets } = await import("./lib/cover-image.mjs");
    clearSlugCoverAssets(slug, enMeta.coverImage);
  }

  const imageInput = {
    title: enMeta.title,
    tags: enMeta.tags,
    imageSearchKeywords: enMeta.imageSearchKeywords,
    imageQuery: query || enMeta.imageQuery,
    topicCluster: enMeta.topicCluster,
  };
  const imageContext = resolveImageContext(slug, imageInput);

  const forced =
    provider === "pexels" || provider === "pixabay" ? provider : undefined;
  const planned = forced ?? pickImageProvider(slug);
  console.log(`Provider plan: ${planned ?? "auto"}`);

  const meta = await fetchCoverImage(slug, imageInput, {
    provider: forced,
    forceRefresh: force,
  });
  if (!meta) {
    console.error(`Failed to fetch cover for ${slug}`);
    process.exit(1);
  }

  const locales = locale === "all" ? ["en", "ko"] : [locale];
  for (const loc of locales) {
    const postPath = path.join(POSTS_DIR, slug, `${loc}.md`);
    if (!fs.existsSync(postPath)) continue;
    const postMeta = readPostMeta(slug, loc);
    const altCtx = {
      ...imageContext,
      productKeywords: meta.imageSearchKeywords ?? imageContext.productKeywords,
    };
    const alts = buildCoverAlts(altCtx);
    const updated = updateFrontmatter(slug, loc, {
      coverImage: meta.coverImage,
      coverImageAlt: loc === "ko" ? alts.ko : alts.en,
      ...(loc === "en" ? { coverImageAltKo: alts.ko } : { coverImageAltKo: alts.ko }),
      coverImageCredit: meta.coverImageCredit,
      ...(meta.imageSearchKeywords
        ? { imageSearchKeywords: meta.imageSearchKeywords }
        : {}),
      ...(meta.coverImageProvider
        ? { coverImageProvider: meta.coverImageProvider }
        : {}),
      ...(meta.coverImageAssetId != null
        ? { coverImageAssetId: meta.coverImageAssetId }
        : {}),
      ...(meta.coverImageSourceUrl
        ? { coverImageSourceUrl: meta.coverImageSourceUrl }
        : {}),
    });
    console.log(`Updated ${updated}`);
  }

  console.log(`Saved ${meta.coverImage}`);
  console.log(`Credit: ${meta.coverImageCredit}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
