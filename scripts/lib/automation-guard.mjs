/**
 * Guards against automation overwriting published or existing posts.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { listPublishedSlugs } from "./content-quality.mjs";

const AUTOMATION_SLUG_EXCLUDE = new Set(["welcome", "adsense-seo-checklist"]);

export function listAllPostSlugs(root = process.cwd()) {
  const postsDir = path.join(root, "content", "posts");
  if (!fs.existsSync(postsDir)) return new Set();
  return new Set(
    fs
      .readdirSync(postsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
}

export function listPublishedPostSlugs(root = process.cwd()) {
  return listPublishedSlugs(root);
}

export function isPublishedSlug(slug, root = process.cwd()) {
  const enPath = path.join(root, "content", "posts", slug, "en.md");
  if (!fs.existsSync(enPath)) return false;
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  return data.draft === false;
}

/**
 * Replenish must create a brand-new slug — never touch existing directories.
 */
export function validateReplenishWrittenSlug(slug, slugsBefore, root = process.cwd()) {
  if (!slug || typeof slug !== "string") {
    return { ok: false, reason: "Replenish did not report a written slug." };
  }

  if (slugsBefore.has(slug)) {
    return {
      ok: false,
      reason: `Slug "${slug}" already existed — replenish must create a NEW slug, not overwrite.`,
    };
  }

  if (isPublishedSlug(slug, root)) {
    return {
      ok: false,
      reason: `Slug "${slug}" is published — automation cannot modify it.`,
    };
  }

  return { ok: true };
}

export function revertPostSlugFromGit(slug) {
  const rel = `content/posts/${slug}`;
  try {
    execSync(`git checkout HEAD -- "${rel}"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function reservedSlugListForPrompt(root = process.cwd()) {
  return [...listAllPostSlugs(root)]
    .filter((slug) => !AUTOMATION_SLUG_EXCLUDE.has(slug))
    .sort();
}

export function isCoverOnlyAutomationPath(scriptName) {
  return (
    scriptName.includes("refresh-duplicate") ||
    scriptName.includes("migrate-cover")
  );
}
