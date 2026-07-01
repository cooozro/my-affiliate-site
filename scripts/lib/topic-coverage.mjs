/**
 * Track which topic IDs already have published posts or drafts on disk.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { inferPostTopic } from "./infer-post-topic.mjs";

const KNOWN_TOPIC_IDS = new Set([
  "portable-ac",
  "window-ac",
  "wireless-earbuds",
  "budget-smartphones",
  "power-banks",
  "mechanical-keyboards",
  "budget-monitors",
  "robot-vacuums",
  "bluetooth-speakers",
  "fitness-trackers",
  "usb-c-hubs",
  "air-purifiers",
  "dehumidifiers",
  "tablet-budget",
  "webcams",
  "electric-fans",
  "noise-cancelling-headphones",
  "portable-ssd",
]);

/**
 * @returns {Map<string, { published: boolean, draft: boolean, slugs: string[] }>}
 */
export function getTopicCoverage(root = process.cwd()) {
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

    if (!KNOWN_TOPIC_IDS.has(topicId)) continue;

    const entry = coverage.get(topicId) ?? {
      published: false,
      draft: false,
      slugs: [],
    };
    if (data.draft) entry.draft = true;
    else entry.published = true;
    entry.slugs.push(slug.name);
    coverage.set(topicId, entry);
  }

  return coverage;
}

/**
 * Block re-using a topic that already has a LIVE post, or a draft in the buffer.
 */
export function isTopicBlocked(topicId, coverage) {
  const entry = coverage.get(topicId);
  if (!entry) return false;
  if (entry.published) return true;
  if (entry.draft) return true;
  return false;
}

export function listBlockedTopicIds(coverage) {
  return [...coverage.entries()]
    .filter(([, entry]) => entry.published || entry.draft)
    .map(([id]) => id);
}
