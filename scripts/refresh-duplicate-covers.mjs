#!/usr/bin/env node
/**
 * Re-fetch covers for posts that share the same image file hash.
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
  loadImageRegistry,
  saveImageRegistry,
  syncImageRegistryFromPosts,
} from "./lib/used-images.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function coverFilePath(coverImage) {
  return path.join(process.cwd(), "public", String(coverImage).replace(/^\//, ""));
}

function findDuplicateCoverSlugs() {
  const byHash = new Map();

  for (const slug of fs.readdirSync(POSTS_DIR)) {
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.coverImage) continue;

    const filePath = coverFilePath(data.coverImage);
    if (!fs.existsSync(filePath)) continue;

    const hash = hashFile(filePath);
    if (!hash) continue;

    const list = byHash.get(hash) ?? [];
    list.push(slug);
    byHash.set(hash, list);
  }

  const duplicates = [];
  for (const slugs of byHash.values()) {
    if (slugs.length > 1) duplicates.push(...slugs);
  }

  return [...new Set(duplicates)].sort();
}

function clearRegistryHashes(hashes) {
  const registry = loadImageRegistry();
  const blocked = new Set(hashes);
  registry.entries = registry.entries.filter((entry) => !entry.hash || !blocked.has(entry.hash));
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
  const oldHash = oldPath && fs.existsSync(oldPath) ? hashFile(oldPath) : null;
  if (oldHash) {
    clearRegistryHashes([oldHash]);
  }

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
  if (availableImageProviders().length === 0) {
    console.error("Missing PEXELS_API_KEY and/or PIXABAY_API_KEY");
    process.exit(1);
  }

  syncImageRegistryFromPosts();
  const slugs = findDuplicateCoverSlugs();
  if (slugs.length === 0) {
    console.log("No duplicate cover hashes found.");
    return;
  }

  const duplicateHashes = new Set();
  for (const slug of slugs) {
    const { data } = matter(
      fs.readFileSync(path.join(POSTS_DIR, slug, "en.md"), "utf8"),
    );
    if (!data.coverImage) continue;
    const filePath = coverFilePath(data.coverImage);
    if (!fs.existsSync(filePath)) continue;
    const hash = hashFile(filePath);
    if (hash) duplicateHashes.add(hash);
  }
  clearRegistryHashes([...duplicateHashes]);

  console.log(`Refreshing ${slugs.length} post(s) with duplicate covers...`);
  let failed = 0;
  for (const slug of slugs) {
    const ok = await refreshSlug(slug);
    if (!ok) failed += 1;
  }

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
