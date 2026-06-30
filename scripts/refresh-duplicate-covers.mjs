#!/usr/bin/env node
/**
 * Re-fetch covers for posts that share the same image file hash.
 * Usage: npm run content:refresh-duplicates
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fetchCoverImage, availableImageProviders } from "./lib/cover-image.mjs";
import { buildCoverAlt, resolveImageContext } from "./lib/image-query.mjs";
import { hashFile, syncImageRegistryFromPosts } from "./lib/used-images.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function findDuplicateCoverSlugs() {
  const byHash = new Map();

  for (const slug of fs.readdirSync(POSTS_DIR)) {
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.coverImage) continue;

    const filePath = path.join(
      process.cwd(),
      "public",
      String(data.coverImage).replace(/^\//, ""),
    );
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

async function refreshSlug(slug) {
  const enPath = path.join(POSTS_DIR, slug, "en.md");
  const { data, content } = matter(fs.readFileSync(enPath, "utf8"));
  const imageContext = resolveImageContext(slug, {
    title: data.title,
    tags: data.tags,
    imageSearchKeywords: data.imageSearchKeywords,
    topicCluster: data.topicCluster,
  });

  const meta = await fetchCoverImage(slug, imageContext);
  if (!meta) {
    console.warn(`Failed to refresh cover for ${slug}`);
    return false;
  }

  for (const locale of ["en", "ko"]) {
    const localePath = path.join(POSTS_DIR, slug, `${locale}.md`);
    if (!fs.existsSync(localePath)) continue;
    const post = matter(fs.readFileSync(localePath, "utf8"));
    const coverImageAlt = buildCoverAlt(locale === "ko" ? "ko" : "en", {
      ...imageContext,
      title: post.data.title,
    });
    const next = {
      ...post.data,
      coverImage: meta.coverImage,
      coverImageAlt,
      coverImageCredit: meta.coverImageCredit,
      coverImageProvider: meta.coverImageProvider,
      coverImageAssetId: meta.coverImageAssetId,
      coverImageSourceUrl: meta.coverImageSourceUrl,
    };
    fs.writeFileSync(localePath, matter.stringify(post.content, next), "utf8");
  }

  const oldCover = data.coverImage;
  if (oldCover && oldCover !== meta.coverImage) {
    const oldPath = path.join(process.cwd(), "public", oldCover.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
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

  console.log(`Refreshing ${slugs.length} post(s) with duplicate covers...`);
  for (const slug of slugs) {
    await refreshSlug(slug);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
