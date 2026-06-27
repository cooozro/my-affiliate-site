#!/usr/bin/env node
/**
 * Fetch a royalty-free cover image (Pexels + Pixabay rotation) and update post frontmatter.
 *
 * Usage:
 *   npm run content:image -- --slug=my-post --query="wireless earbuds"
 *
 * Env: PEXELS_API_KEY and/or PIXABAY_API_KEY in .env.local
 * Keys: https://www.pexels.com/api/ | https://pixabay.com/api/docs/
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  availableImageProviders,
  fetchCoverImage,
  pickImageProvider,
} from "./lib/cover-image.mjs";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content", "posts");

function parseArgs(argv) {
  const args = { slug: "", query: "", locale: "en", provider: "" };

  for (const arg of argv) {
    if (arg.startsWith("--slug=")) args.slug = arg.slice(7);
    if (arg.startsWith("--query=")) args.query = arg.slice(8);
    if (arg.startsWith("--locale=")) args.locale = arg.slice(9);
    if (arg.startsWith("--provider=")) args.provider = arg.slice(11);
  }

  return args;
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

async function main() {
  const { slug, query, locale, provider } = parseArgs(process.argv.slice(2));

  if (!slug || !query) {
    console.error(
      'Usage: npm run content:image -- --slug=post-slug --query="search terms" [--provider=pexels|pixabay]',
    );
    process.exit(1);
  }

  if (availableImageProviders().length === 0) {
    console.error(
      "Missing PEXELS_API_KEY and PIXABAY_API_KEY. Add at least one to .env.local",
    );
    process.exit(1);
  }

  const forced =
    provider === "pexels" || provider === "pixabay" ? provider : undefined;
  const planned = forced ?? pickImageProvider(slug);
  console.log(`Provider plan: ${planned ?? "auto"} (available: ${availableImageProviders().join(", ")})`);

  const meta = await fetchCoverImage(slug, query, { provider: forced });
  if (!meta) {
    console.error(`Failed to fetch cover for ${slug}`);
    process.exit(1);
  }

  const locales = locale === "all" ? ["en", "ko"] : [locale];
  for (const loc of locales) {
    const postPath = path.join(POSTS_DIR, slug, `${loc}.md`);
    if (!fs.existsSync(postPath)) continue;
    const updated = updateFrontmatter(slug, loc, {
      coverImage: meta.coverImage,
      coverImageAlt: meta.coverImageAlt,
      coverImageCredit: meta.coverImageCredit,
      ...(meta.coverImageProvider
        ? { coverImageProvider: meta.coverImageProvider }
        : {}),
    });
    console.log(`Updated ${updated}`);
  }

  console.log(`Saved public/images/posts/${slug}/cover.jpg`);
  console.log(`Credit: ${meta.coverImageCredit}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
