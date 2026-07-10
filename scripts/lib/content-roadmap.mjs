/**
 * Content roadmap — personal/small tech first, then full taxonomy, then format rotation.
 *
 * Phase tier1-first-pass: Tier-1 topics with zero posts (any format)
 * Phase tier2-first-pass: Remaining topics with zero posts
 * Phase format-rotation: topic×format pairs (one post per combo; new formats OK)
 */

import { PRODUCT_TOPICS } from "./product-taxonomy.mjs";

/** 1인 설치·사용 가능 — 소형가전·데스크·모바일·플러그앤플레이 위주 */
export const TIER1_PERSONAL_TOPIC_IDS = new Set([
  "wireless-earbuds",
  "noise-cancelling-headphones",
  "bluetooth-speakers",
  "budget-smartphones",
  "tablet-budget",
  "power-banks",
  "fitness-trackers",
  "portable-ssd",
  "usb-c-hubs",
  "laptops",
  "budget-monitors",
  "mechanical-keyboards",
  "webcams",
  "air-purifiers",
  "dehumidifiers",
  "electric-fans",
  "portable-ac",
  "robot-vacuums",
  "cordless-vacuums",
  "air-fryers",
  "coffee-machines",
  "rice-cookers",
  "gaming-consoles",
  "action-cameras",
  "smart-home-cameras",
]);

export const ROADMAP_PHASES = [
  "tier1-first-pass",
  "tier2-first-pass",
  "format-rotation",
];

/**
 * @param {Map<string, { slugs: string[] }>} coverage
 */
export function topicHasAnyPost(topicId, coverage) {
  const entry = coverage.get(topicId);
  return Boolean(entry?.slugs?.length);
}

/**
 * @param {Map<string, { slugs: string[] }>} coverage
 */
export function tier1FirstPassComplete(coverage) {
  for (const id of TIER1_PERSONAL_TOPIC_IDS) {
    if (!topicHasAnyPost(id, coverage)) return false;
  }
  return true;
}

/**
 * @param {Map<string, { slugs: string[] }>} coverage
 */
export function allTopicsHaveFirstPost(coverage) {
  return PRODUCT_TOPICS.every((topic) => topicHasAnyPost(topic.id, coverage));
}

/**
 * @param {Map<string, { slugs: string[] }>} coverage
 * @returns {'tier1-first-pass' | 'tier2-first-pass' | 'format-rotation'}
 */
export function getRoadmapPhase(coverage) {
  if (!tier1FirstPassComplete(coverage)) return "tier1-first-pass";
  if (!allTopicsHaveFirstPost(coverage)) return "tier2-first-pass";
  return "format-rotation";
}

/**
 * @param {object} topic
 * @param {string} contentProfile
 * @param {Map} coverage
 * @param {Map} clusterCoverage
 * @param {string} roadmapPhase
 * @param {(topic: object, profile: string) => boolean} formatBlockedFn
 */
export function isTopicBlockedByRoadmap(
  topic,
  contentProfile,
  coverage,
  clusterCoverage,
  roadmapPhase,
  formatBlockedFn,
) {
  if (roadmapPhase === "tier1-first-pass") {
    if (!TIER1_PERSONAL_TOPIC_IDS.has(topic.id)) return true;
    if (topicHasAnyPost(topic.id, coverage)) return true;
    return false;
  }

  if (roadmapPhase === "tier2-first-pass") {
    if (topicHasAnyPost(topic.id, coverage)) return true;
    return false;
  }

  return formatBlockedFn(topic, contentProfile, coverage, clusterCoverage);
}

export function describeRoadmapPhase(phase, coverage) {
  if (phase === "tier1-first-pass") {
    const missing = [...TIER1_PERSONAL_TOPIC_IDS].filter(
      (id) => !topicHasAnyPost(id, coverage),
    );
    return `Tier-1 first pass (${missing.length} personal-tech topics without any post)`;
  }
  if (phase === "tier2-first-pass") {
    const missing = PRODUCT_TOPICS.filter(
      (t) => !topicHasAnyPost(t.id, coverage),
    ).map((t) => t.id);
    return `Full taxonomy first pass (${missing.length} topics without any post) + meta angles`;
  }
  if (phase === "format-rotation") {
    return "Format rotation (new topic×format pairs + cross-category meta angles)";
  }
  return "Content roadmap";
}
