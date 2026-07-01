/**
 * Track topic × format and topicCluster × format coverage on disk.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { inferPostTopic } from "./infer-post-topic.mjs";
import { POST_TOPIC_IDS, PRODUCT_TOPICS } from "./product-taxonomy.mjs";

const TOPIC_CLUSTER_BY_ID = new Map(
  PRODUCT_TOPICS.map((t) => [t.id, t.topicCluster ?? t.cluster ?? null]),
);

/**
 * @typedef {{
 *   publishedFormats: Set<string>,
 *   draftFormats: Set<string>,
 *   slugs: string[],
 * }} TopicCoverageEntry
 */

/**
 * @typedef {{
 *   formats: Set<string>,
 *   slugs: string[],
 * }} ClusterCoverageEntry
 */

function resolveTopicId(slug, data) {
  if (typeof data.topicId === "string" && data.topicId.trim()) {
    return data.topicId.trim();
  }
  return inferPostTopic(slug, data).id;
}

function resolveCluster(topicId, data, inferred) {
  if (typeof data.topicCluster === "string" && data.topicCluster.trim()) {
    return data.topicCluster.trim();
  }
  if (inferred?.cluster) return inferred.cluster;
  return TOPIC_CLUSTER_BY_ID.get(topicId) ?? null;
}

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
    const inferred = inferPostTopic(slug.name, data);
    const topicId = resolveTopicId(slug.name, data);

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

/**
 * @returns {Map<string, ClusterCoverageEntry>}
 */
export function getClusterFormatCoverage(root = process.cwd()) {
  const postsDir = path.join(root, "content", "posts");
  const coverage = new Map();

  if (!fs.existsSync(postsDir)) return coverage;

  for (const slug of fs.readdirSync(postsDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const enPath = path.join(postsDir, slug.name, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    const inferred = inferPostTopic(slug.name, data);
    const topicId = resolveTopicId(slug.name, data);
    const cluster = resolveCluster(topicId, data, inferred);
    if (!cluster) continue;

    const profile = String(data.contentProfile ?? "buying-guide");
    const entry = coverage.get(cluster) ?? { formats: new Set(), slugs: [] };
    entry.formats.add(profile);
    entry.slugs.push(slug.name);
    coverage.set(cluster, entry);
  }

  return coverage;
}

/** @deprecated */
export function getTopicCoverage(root = process.cwd()) {
  return getTopicFormatCoverage(root);
}

export function isTopicFormatBlocked(topicId, contentProfile, coverage) {
  if (!contentProfile) return false;
  const entry = coverage.get(topicId);
  if (!entry) return false;
  if (entry.publishedFormats.has(contentProfile)) return true;
  if (entry.draftFormats.has(contentProfile)) return true;
  return false;
}

/**
 * Block repeating the same contentProfile within a topic cluster (e.g. air-conditioning).
 */
export function isClusterFormatBlocked(topic, contentProfile, clusterCoverage) {
  if (!contentProfile) return false;
  const cluster = topic.topicCluster ?? topic.cluster;
  if (!cluster) return false;
  const entry = clusterCoverage.get(cluster);
  if (!entry) return false;
  return entry.formats.has(contentProfile);
}

export function topicFormatUsageCount(topicId, coverage) {
  const entry = coverage.get(topicId);
  if (!entry) return 0;
  const all = new Set([...entry.publishedFormats, ...entry.draftFormats]);
  return all.size;
}

export function clusterFormatUsageCount(cluster, clusterCoverage) {
  const entry = clusterCoverage.get(cluster);
  if (!entry) return 0;
  return entry.formats.size;
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

export function listBlockedClusterFormats(clusterCoverage) {
  const lines = [];
  for (const [cluster, entry] of clusterCoverage.entries()) {
    for (const profile of entry.formats) {
      lines.push(`${cluster}:${profile} (${entry.slugs.length} post(s))`);
    }
  }
  return lines;
}
