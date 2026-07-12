#!/usr/bin/env node
/**
 * Re-fetch covers for posts that share the same hero image (file hash OR visual content hash).
 * Usage: npm run content:refresh-duplicates
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fetchCoverImage, availableImageProviders } from "./lib/cover-image.mjs";
import { buildCoverAlts, resolveImageContext } from "./lib/image-query.mjs";
import { isPublishedSlug } from "./lib/automation-guard.mjs";
import {
  hashFile,
  hashImageContentFile,
  loadImageRegistry,
  saveImageRegistry,
  syncImageRegistryFromPosts,
} from "./lib/used-images.mjs";
import { ensureImageApiEnv, printImageApiKeyHelp } from "./lib/image-api-env.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function coverFilePath(coverImage) {
  return path.join(process.cwd(), "public", String(coverImage).replace(/^\//, ""));
}

function findDuplicateCoverSlugs() {
  const byFileHash = new Map();
  const byContentHash = new Map();

  for (const slug of fs.readdirSync(POSTS_DIR)) {
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.coverImage) continue;

    const filePath = coverFilePath(data.coverImage);
    if (!fs.existsSync(filePath)) continue;

    const fileHash = hashFile(filePath);
    const contentHash = hashImageContentFile(filePath);

    if (fileHash) {
      const list = byFileHash.get(fileHash) ?? [];
      list.push(slug);
      byFileHash.set(fileHash, list);
    }
    if (contentHash) {
      const list = byContentHash.get(contentHash) ?? [];
      list.push(slug);
      byContentHash.set(contentHash, list);
    }
  }

  const duplicates = new Set();
  for (const slugs of byFileHash.values()) {
    if (slugs.length > 1) for (const s of slugs) duplicates.add(s);
  }
  for (const slugs of byContentHash.values()) {
    if (slugs.length > 1) for (const s of slugs) duplicates.add(s);
  }

  return [...duplicates].sort();
}

function clearRegistryForSlug(slug) {
  const registry = loadImageRegistry();
  registry.entries = registry.entries.filter((entry) => entry.slug !== slug);
  saveImageRegistry(registry);
}

async function refreshSlug(slug) {
  if (isPublishedSlug(slug)) {
    console.log(`Skip ${slug}: published post — cover preserved`);
    return false;
  }

  const enPath = path.join(POSTS_DIR, slug, "en.md");
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  const imageContext = resolveImageContext(slug, {
    title: data.title,
    tags: data.tags,
    imageSearchKeywords: data.imageSearchKeywords,
    topicCluster: data.topicCluster,
  });

  const oldCover = data.coverImage;
  const oldPath = oldCover ? coverFilePath(oldCover) : null;

  clearRegistryForSlug(slug);

  const meta = await fetchCoverImage(slug, imageContext, { forceRefresh: true });
  if (!meta) {
    console.warn(`Failed to refresh cover for ${slug}`);
    return false;
  }

  const alts = buildCoverAlts(imageContext);

  for (const locale of ["en", "ko"]) {
    const localePath = path.join(POSTS_DIR, slug, `${locale}.md`);
    if (!fs.existsSync(localePath)) continue;
    const post = matter(fs.readFileSync(localePath, "utf8"));
    const next = {
      ...post.data,
      coverImage: meta.coverImage,
      coverImageAlt: locale === "ko" ? alts.ko : alts.en,
      coverImageAltKo: alts.ko,
      coverImageCredit: meta.coverImageCredit,
      coverImageProvider: meta.coverImageProvider,
      coverImageAssetId: meta.coverImageAssetId,
      coverImageSourceUrl: meta.coverImageSourceUrl,
    };
    fs.writeFileSync(localePath, matter.stringify(post.content, next), "utf8");
  }

  if (oldCover && oldCover !== meta.coverImage && oldPath && fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
  }

  console.log(`Refreshed ${slug} → ${meta.coverImage}`);
  return true;
}

async function main() {
  ensureImageApiEnv();
  if (availableImageProviders().length === 0) {
    printImageApiKeyHelp();
    process.exit(1);
  }

  syncImageRegistryFromPosts();
  const slugs = findDuplicateCoverSlugs();
  if (slugs.length === 0) {
    console.log("No duplicate cover hashes found.");
    return;
  }

  console.log(
    `Refreshing ${slugs.length} post(s) with duplicate covers (file or visual content):`,
  );
  console.log(slugs.join(", "));

  let failed = 0;
  for (const slug of slugs) {
    const ok = await refreshSlug(slug);
    if (!ok) failed += 1;
  }

  syncImageRegistryFromPosts();
  const remaining = findDuplicateCoverSlugs();
  if (remaining.length > 0) {
    console.error(`Duplicate covers remain for: ${remaining.join(", ")}`);
    process.exit(1);
  }

  if (failed > 0) {
    process.exit(1);
  }

  console.log("All duplicate covers replaced.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
