/**
 * Pipeline Guardian — automation guards (do not import outside guardian/index).
 * Guards against automation overwriting published or existing posts.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { listPublishedSlugs } from "../content-quality.mjs";
import { topicHasAnyPost } from "../content-roadmap.mjs";
import { getTopicFormatCoverage } from "../topic-coverage.mjs";
import { inferPostTopic } from "../infer-post-topic.mjs";

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

/** One topic id must not appear in two slugs during first-pass / draft buffer. */
export function validateReplenishTopicUnique(slug, root = process.cwd()) {
  const enPath = path.join(root, "content", "posts", slug, "en.md");
  if (!fs.existsSync(enPath)) {
    return { ok: false, reason: `Missing en.md for ${slug}` };
  }

  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  const topic = inferPostTopic(slug, data);
  const coverage = getTopicFormatCoverage(root);
  const entry = coverage.get(topic.id);

  if (!entry) return { ok: true };

  const others = entry.slugs.filter((s) => s !== slug);
  if (others.length > 0) {
    return {
      ok: false,
      reason: `Topic "${topic.id}" already has post(s): ${others.join(", ")}`,
    };
  }

  return { ok: true };
}

export function removeReplenishSlugArtifacts(slug, root = process.cwd()) {
  const postDir = path.join(root, "content", "posts", slug);
  if (fs.existsSync(postDir)) {
    fs.rmSync(postDir, { recursive: true, force: true });
  }
  for (const prefix of ["public/images/posts", "images/posts"]) {
    const imgDir = path.join(root, prefix, slug);
    if (fs.existsSync(imgDir)) {
      fs.rmSync(imgDir, { recursive: true, force: true });
    }
  }
}

/**
 * Pending request still points at a topic that already has a post (e.g. after failed validate + commit).
 */
export function isRequestTopicStale(request, root = process.cwd()) {
  const topicId = request?.topic?.id;
  if (!topicId || typeof topicId !== "string") return false;
  const coverage = getTopicFormatCoverage(root);
  return topicHasAnyPost(topicId, coverage);
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
