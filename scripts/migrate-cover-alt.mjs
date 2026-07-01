#!/usr/bin/env node
/**
 * Rewrite coverImageAlt / coverImageAltKo to short SEO-friendly text (no title duplication).
 *
 * Usage: node scripts/migrate-cover-alt.mjs
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { buildCoverAlts, resolveImageContext } from "./lib/image-query.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function listSlugs() {
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function migrateSlug(slug) {
  const enPath = path.join(POSTS_DIR, slug, "en.md");
  if (!fs.existsSync(enPath)) return false;

  const enRaw = fs.readFileSync(enPath, "utf8");
  const enParsed = matter(enRaw);
  const ctx = resolveImageContext(slug, {
    title: enParsed.data.title,
    tags: enParsed.data.tags,
    imageSearchKeywords: enParsed.data.imageSearchKeywords,
    imageQuery: enParsed.data.imageQuery,
    topicCluster: enParsed.data.topicCluster,
  });

  const alts = buildCoverAlts(ctx);
  let changed = false;

  const enPathOut = path.join(POSTS_DIR, slug, "en.md");
  const enNext = {
    ...enParsed.data,
    coverImageAlt: alts.en,
    coverImageAltKo: alts.ko,
  };
  if (
    enParsed.data.coverImageAlt !== alts.en ||
    enParsed.data.coverImageAltKo !== alts.ko
  ) {
    fs.writeFileSync(enPathOut, matter.stringify(enParsed.content, enNext), "utf8");
    console.log(`${slug}/en.md`);
    console.log(`  EN: ${alts.en}`);
    console.log(`  KO: ${alts.ko}`);
    changed = true;
  }

  const koPath = path.join(POSTS_DIR, slug, "ko.md");
  if (fs.existsSync(koPath)) {
    const koParsed = matter(fs.readFileSync(koPath, "utf8"));
    const koNext = {
      ...koParsed.data,
      coverImageAlt: alts.ko,
      coverImageAltKo: alts.ko,
    };
    if (
      koParsed.data.coverImageAlt !== alts.ko ||
      koParsed.data.coverImageAltKo !== alts.ko
    ) {
      fs.writeFileSync(koPath, matter.stringify(koParsed.content, koNext), "utf8");
      console.log(`${slug}/ko.md → ${alts.ko}`);
      changed = true;
    }
  }

  return changed;
}

let count = 0;
for (const slug of listSlugs()) {
  if (migrateSlug(slug)) count += 1;
}
console.log(`\nUpdated ${count} slug(s)`);
