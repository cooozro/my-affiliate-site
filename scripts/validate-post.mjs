#!/usr/bin/env node
/**
 * Validate blog posts against AdSense-safe, SEO-friendly content standards.
 *
 * Usage: npm run content:validate
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  auditPublishedPost,
  MIN_BODY_CHARS,
} from "./lib/content-quality.mjs";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content", "posts");

const REQUIRED_LOCALES = ["en", "ko"];

function listSlugDirs() {
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function main() {
  const allIssues = [];

  for (const slug of listSlugDirs()) {
    const localeFiles = REQUIRED_LOCALES.map((locale) => ({
      locale,
      path: path.join(POSTS_DIR, slug, `${locale}.md`),
    }));

    const publishedLocales = localeFiles.filter(({ path: filePath }) => {
      if (!fs.existsSync(filePath)) return false;
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      return !data.draft;
    });

    for (const { locale, path: filePath } of localeFiles) {
      if (!fs.existsSync(filePath)) {
        if (publishedLocales.length > 0) {
          allIssues.push(`${slug}/${locale}.md: missing locale file`);
        }
        continue;
      }

      allIssues.push(...auditPublishedPost(ROOT, slug, locale));
    }
  }

  if (allIssues.length > 0) {
    console.error("Content validation failed:\n");
    for (const issue of allIssues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `All published posts passed Google content self-audit (min ${MIN_BODY_CHARS} chars).`,
  );
}

main();
