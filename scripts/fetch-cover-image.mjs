#!/usr/bin/env node
/**
 * Fetch a royalty-free cover image from Pexels and update post frontmatter.
 *
 * Usage:
 *   PEXELS_API_KEY=your_key npm run content:image -- --slug=my-post --query="wireless earbuds"
 *
 * Get a free API key: https://www.pexels.com/api/
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content", "posts");

function parseArgs(argv) {
  const args = { slug: "", query: "", locale: "en" };

  for (const arg of argv) {
    if (arg.startsWith("--slug=")) args.slug = arg.slice(7);
    if (arg.startsWith("--query=")) args.query = arg.slice(8);
    if (arg.startsWith("--locale=")) args.locale = arg.slice(9);
  }

  return args;
}

async function searchPexels(query, apiKey) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status}`);
  }

  const data = await response.json();
  const photo = data.photos?.[0];

  if (!photo) {
    throw new Error(`No Pexels results for query: ${query}`);
  }

  return photo;
}

async function downloadImage(imageUrl, destPath) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
}

function updateFrontmatter(slug, locale, fields) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const next = { ...data, ...fields };
  const frontmatter = matter.stringify(content, next);

  fs.writeFileSync(filePath, frontmatter, "utf8");
  return filePath;
}

async function main() {
  const { slug, query, locale } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.PEXELS_API_KEY;

  if (!slug || !query) {
    console.error(
      "Usage: PEXELS_API_KEY=... npm run content:image -- --slug=post-slug --query=\"search terms\"",
    );
    process.exit(1);
  }

  if (!apiKey) {
    console.error(
      "Missing PEXELS_API_KEY. Get a free key at https://www.pexels.com/api/",
    );
    process.exit(1);
  }

  const photo = await searchPexels(query, apiKey);
  const imageUrl = photo.src.large2x || photo.src.large;
  const relativePath = `/images/posts/${slug}/cover.jpg`;
  const destPath = path.join(ROOT, "public", "images", "posts", slug, "cover.jpg");

  await downloadImage(imageUrl, destPath);

  const photographer = photo.photographer ?? "Pexels";
  const credit = `Photo by ${photographer} / Pexels`;
  const alt = query;

  const updated = updateFrontmatter(slug, locale, {
    coverImage: relativePath,
    coverImageAlt: alt,
    coverImageCredit: credit,
  });

  console.log(`Saved ${destPath}`);
  console.log(`Updated ${updated}`);
  console.log(`Credit: ${credit}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
