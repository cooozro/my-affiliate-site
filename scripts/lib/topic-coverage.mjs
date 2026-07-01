/**
 * Track which topic × contentProfile pairs already exist on disk.
 * Same product line can have buying-guide + explainer + checklist without blocking.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { inferPostTopic } from "./infer-post-topic.mjs";
import { POST_TOPIC_IDS } from "./product-taxonomy.mjs";

/**
 * @typedef {{
 *   publishedFormats: Set<string>,
 *   draftFormats: Set<string>,
 *   slugs: string[],
 * }} TopicCoverageEntry
 */

/**
 * @returns {Map<string, TopicCoverageEntry>}
 */
export function getTopicFormatCoverage(root = process.cwd()) {
  const postsDir = path.join(root, "content", "posts");
  const coverage = new Map();

  if (!fs.existsSync(postsDir)) return coverage;

  for (const slug of fs.readdirSync(postsDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const enPath = path.join(postsDir, slug.name, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    const topic = inferPostTopic(slug.name, data);
    const topicId = topic.id;

    if (!POST_TOPIC_IDS.has(topicId)) continue;

    const profile = String(data.contentProfile ?? "buying-guide");
    const entry = coverage.get(topicId) ?? {
      publishedFormats: new Set(),
      draftFormats: new Set(),
      slugs: [],
    };

    if (data.draft) entry.draftFormats.add(profile);
    else entry.publishedFormats.add(profile);

    entry.slugs.push(slug.name);
    coverage.set(topicId, entry);
  }

  return coverage;
}

/** @deprecated Use getTopicFormatCoverage — kept for callers migrating gradually */
export function getTopicCoverage(root = process.cwd()) {
  return getTopicFormatCoverage(root);
}

/**
 * Block re-using the same topic + contentProfile when a post or draft already exists.
 */
export function isTopicFormatBlocked(topicId, contentProfile, coverage) {
  if (!contentProfile) return false;
  const entry = coverage.get(topicId);
  if (!entry) return false;
  if (entry.publishedFormats.has(contentProfile)) return true;
  if (entry.draftFormats.has(contentProfile)) return true;
  return false;
}

/** How many distinct formats already exist for this topic (lower = fresher). */
export function topicFormatUsageCount(topicId, coverage) {
  const entry = coverage.get(topicId);
  if (!entry) return 0;
  const all = new Set([...entry.publishedFormats, ...entry.draftFormats]);
  return all.size;
}

export function listBlockedTopicFormats(coverage) {
  const lines = [];
  for (const [topicId, entry] of coverage.entries()) {
    for (const profile of entry.publishedFormats) {
      lines.push(`${topicId}:${profile} (published)`);
    }
    for (const profile of entry.draftFormats) {
      lines.push(`${topicId}:${profile} (draft)`);
    }
  }
  return lines;
}
