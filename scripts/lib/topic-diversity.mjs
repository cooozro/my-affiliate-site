/**
 * Prevent topic/category clustering in draft and publish queues.
 * Max 2 consecutive same topic id, category, or topic cluster (3rd blocked).
 */

import { getPublishTopicHistory } from "./infer-post-topic.mjs";
import { PRODUCT_TOPICS } from "./product-taxonomy.mjs";
import {
  TIER1_PERSONAL_TOPIC_IDS,
  topicHasAnyPost,
} from "./content-roadmap.mjs";
import { getTopicFormatCoverage } from "./topic-coverage.mjs";

export const MAX_CONSECUTIVE_SAME_TOPIC = 2;
export const MAX_CONSECUTIVE_SAME_CATEGORY = 2;
export const MAX_CONSECUTIVE_SAME_CLUSTER = 2;

/** @typedef {{ id: string, category?: string, cluster?: string, at?: string }} TopicHistoryEntry */

/**
 * @param {TopicHistoryEntry[]} history
 * @param {(entry: TopicHistoryEntry) => string | undefined} getKey
 * @param {string | undefined} key
 */
export function trailingConsecutiveCount(history, getKey, key) {
  if (!key || history.length === 0) return 0;

  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (getKey(history[i]) === key) count += 1;
    else break;
  }
  return count;
}

/**
 * @param {object} topic
 * @param {TopicHistoryEntry[]} history
 */
export function wouldViolateTopicDiversity(topic, history) {
  const recent = history ?? [];

  if (
    trailingConsecutiveCount(recent, (e) => e.id, topic.id) >=
    MAX_CONSECUTIVE_SAME_TOPIC
  ) {
    return { blocked: true, reason: `topic id "${topic.id}" already ${MAX_CONSECUTIVE_SAME_TOPIC}x in a row` };
  }

  if (
    topic.category &&
    trailingConsecutiveCount(recent, (e) => e.category, topic.category) >=
      MAX_CONSECUTIVE_SAME_CATEGORY
  ) {
    return {
      blocked: true,
      reason: `category "${topic.category}" already ${MAX_CONSECUTIVE_SAME_CATEGORY}x in a row`,
    };
  }

  const cluster = topic.topicCluster ?? topic.cluster;
  if (
    cluster &&
    trailingConsecutiveCount(recent, (e) => e.cluster, cluster) >=
      MAX_CONSECUTIVE_SAME_CLUSTER
  ) {
    return {
      blocked: true,
      reason: `cluster "${cluster}" already ${MAX_CONSECUTIVE_SAME_CLUSTER}x in a row`,
    };
  }

  return { blocked: false };
}

/**
 * @param {object[]} candidates
 * @param {TopicHistoryEntry[]} history
 */
export function filterByTopicDiversity(candidates, history) {
  return candidates.filter((t) => !wouldViolateTopicDiversity(t, history).blocked);
}

/**
 * Tier-1 first pass: defer a taxonomy group that already has a post while
 * another product group still has zero coverage (e.g. robot vac done → wait on stick vac).
 * @param {object} topic
 * @param {string} [roadmapPhase]
 * @param {Map} [coverage]
 */
export function wouldViolateTaxonomyGroupSpread(topic, roadmapPhase, coverage) {
  if (roadmapPhase !== "tier1-first-pass") {
    return { blocked: false };
  }

  const group = topic.taxonomyGroup;
  if (!group) return { blocked: false };

  const cov = coverage ?? getTopicFormatCoverage();

  const siblingPosted = PRODUCT_TOPICS.some(
    (t) =>
      t.taxonomyGroup === group &&
      t.id !== topic.id &&
      topicHasAnyPost(t.id, cov),
  );
  if (!siblingPosted) return { blocked: false };

  const fresherGroupExists = PRODUCT_TOPICS.some((t) => {
    if (!TIER1_PERSONAL_TOPIC_IDS.has(t.id)) return false;
    if (topicHasAnyPost(t.id, cov)) return false;
    if (t.taxonomyGroup === group) return false;
    const groupPosted = PRODUCT_TOPICS.some(
      (s) => s.taxonomyGroup === t.taxonomyGroup && topicHasAnyPost(s.id, cov),
    );
    return !groupPosted;
  });

  if (fresherGroupExists) {
    return {
      blocked: true,
      reason: `taxonomy group "${group}" already covered — rotate to an uncovered product group first`,
    };
  }

  return { blocked: false };
}

/**
 * @param {object[]} candidates
 * @param {string} roadmapPhase
 * @param {Map} [coverage]
 */
export function filterByTaxonomyGroupSpread(candidates, roadmapPhase, coverage) {
  return candidates.filter(
    (t) => !wouldViolateTaxonomyGroupSpread(t, roadmapPhase, coverage).blocked,
  );
}

/** Lower = pick sooner (groups with fewer existing posts first). */
export function taxonomyGroupCoveragePenalty(topic, coverage) {
  const group = topic.taxonomyGroup;
  if (!group) return 0;
  const cov = coverage ?? getTopicFormatCoverage();
  return PRODUCT_TOPICS.filter(
    (t) => t.taxonomyGroup === group && topicHasAnyPost(t.id, cov),
  ).length;
}

/**
 * @param {object} state
 * @param {object} topic
 */
export function recordTopicPick(state, topic) {
  const entry = {
    id: topic.id,
    category: topic.category,
    cluster: topic.topicCluster ?? topic.cluster,
    taxonomyGroup: topic.taxonomyGroup,
    at: new Date().toISOString(),
  };

  state.topicHistory = [...(state.topicHistory ?? []), entry].slice(-30);
  return entry;
}

/**
 * @param {object} state
 */
export function getTopicHistory(state) {
  const fromPublishes = getPublishTopicHistory(state);

  if (state.topicHistory?.length) {
    return [...fromPublishes, ...state.topicHistory].slice(-30);
  }

  const fromWrites = (state.history ?? [])
    .filter((h) => h.action === "write" && h.topic)
    .map((h) => ({ id: h.topic, at: h.at }));

  return [...fromPublishes, ...fromWrites].slice(-30);
}
