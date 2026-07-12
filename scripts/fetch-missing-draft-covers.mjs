#!/usr/bin/env node
/**
 * Fetch cover images for draft posts that lack coverImage OR share visual content with another post.
 * Used on GHA where PEXELS_API_KEY / PIXABAY_API_KEY live in Secrets.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import matter from "gray-matter";
import {
  hashFile,
  hashImageContentFile,
  syncImageRegistryFromPosts,
} from "./lib/used-images.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const SKIP_SLUGS = new Set(["adsense-seo-checklist", "aipick-seo-precision-report"]);

function coverFilePath(coverImage) {
  return path.join(process.cwd(), "public", String(coverImage).replace(/^\//, ""));
}

function listDraftSlugsMissingCover() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const slugs = [];
  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    if (SKIP_SLUGS.has(slug)) continue;

    const enPath = path.join(POSTS_DIR, slug, "en.md");
    const koPath = path.join(POSTS_DIR, slug, "ko.md");
    if (!fs.existsSync(enPath) || !fs.existsSync(koPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.draft) continue;
    if (!data.coverImage) slugs.push(slug);
  }

  return slugs.sort();
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

function defaultQuery(slug) {
  const enPath = path.join(POSTS_DIR, slug, "en.md");
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  const keywords = data.imageSearchKeywords;
  if (Array.isArray(keywords) && keywords[0]) return String(keywords[0]);
  return slug.replace(/-/g, " ");
}

syncImageRegistryFromPosts();

const missing = listDraftSlugsMissingCover();
const duplicateDrafts = findDuplicateCoverSlugs().filter((slug) => {
  const enPath = path.join(POSTS_DIR, slug, "en.md");
  if (!fs.existsSync(enPath)) return false;
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  return Boolean(data.draft);
});

const targets = [...new Set([...missing, ...duplicateDrafts])].sort();

if (targets.length === 0) {
  console.log("No draft posts missing coverImage or duplicate hero content.");
  process.exit(0);
}

if (!process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) {
  console.error("Missing PEXELS_API_KEY and PIXABAY_API_KEY in environment.");
  process.exit(1);
}

if (missing.length > 0) {
  console.log(`Missing cover: ${missing.join(", ")}`);
}
if (duplicateDrafts.length > 0) {
  console.log(`Duplicate hero content: ${duplicateDrafts.join(", ")}`);
}

console.log(`Fetching covers for ${targets.length} draft(s): ${targets.join(", ")}`);

let failed = false;

for (const slug of targets) {
  const query = defaultQuery(slug);
  const force = duplicateDrafts.includes(slug);
  console.log(`\n→ ${slug} (query: ${query}${force ? ", force refresh" : ""})`);
  const args = [
    "scripts/fetch-cover-image.mjs",
    `--slug=${slug}`,
    `--query=${query}`,
    "--locale=all",
  ];
  if (force) args.push("--force");
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    failed = true;
    console.error(`Failed to fetch cover for ${slug}`);
  }
}

if (failed) process.exit(1);

syncImageRegistryFromPosts();
console.log("\nDone.");
