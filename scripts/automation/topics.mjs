/**
 * IT review topics for AI Pick & Report.
 * Season metadata drives pickTopic() — current KST month/event boosts priority.
 */
import { PRODUCT_TOPICS } from "../lib/product-taxonomy.mjs";
import { pickSeasonalTopic } from "../lib/season-topics.mjs";
import {
  getTopicFormatCoverage,
  isTopicFormatBlocked,
  listBlockedTopicFormats,
  topicFormatUsageCount,
} from "../lib/topic-coverage.mjs";
import {
  filterByTopicDiversity,
  getTopicHistory,
  recordTopicPick,
  wouldViolateTopicDiversity,
} from "../lib/topic-diversity.mjs";

export const POST_TOPICS = PRODUCT_TOPICS;

function supportsFormat(topic, contentProfile) {
  if (!contentProfile) return true;
  return !topic.allowedFormats || topic.allowedFormats.includes(contentProfile);
}

function sortByFreshness(candidates, coverage, recentlyUsed) {
  return [...candidates].sort((a, b) => {
    const usageA = topicFormatUsageCount(a.id, coverage);
    const usageB = topicFormatUsageCount(b.id, coverage);
    if (usageA !== usageB) return usageA - usageB;
    const recentA = recentlyUsed.has(a.id) ? 1 : 0;
    const recentB = recentlyUsed.has(b.id) ? 1 : 0;
    return recentA - recentB;
  });
}

/**
 * Pick next topic — prefer uncovered product lines, then season score.
 * @param {object} state
 * @param {{ contentProfile?: string }} [options]
 */
export function pickTopic(state, options = {}) {
  const contentProfile = options.contentProfile ?? "buying-guide";
  const recentlyUsed = new Set(state.usedTopicIds ?? []);
  const topicHistory = getTopicHistory(state);
  const coverage = getTopicFormatCoverage();

  const formatAvailable = (t) =>
    supportsFormat(t, contentProfile) &&
    !isTopicFormatBlocked(t.id, contentProfile, coverage);

  let candidates = sortByFreshness(
    POST_TOPICS.filter(formatAvailable),
    coverage,
    recentlyUsed,
  );

  candidates = filterByTopicDiversity(candidates, topicHistory);

  if (candidates.length === 0) {
    candidates = sortByFreshness(
      POST_TOPICS.filter(
        (t) =>
          formatAvailable(t) &&
          !wouldViolateTopicDiversity(t, topicHistory).blocked,
      ),
      coverage,
      recentlyUsed,
    );
  }

  if (candidates.length === 0) {
    console.warn(
      "No fresh topic×format pairs — relaxing diversity guard for this profile",
    );
    candidates = sortByFreshness(
      POST_TOPICS.filter(formatAvailable),
      coverage,
      new Set(),
    );
  }

  if (candidates.length === 0) {
    throw new Error(
      `All ${POST_TOPICS.length} topics already have a ${contentProfile} post or draft — pick another contentProfile or add taxonomy entries`,
    );
  }

  const blocked = listBlockedTopicFormats(coverage);
  if (blocked.length > 0) {
    console.log(
      `Topic×format pool excludes ${blocked.length} existing pair(s) (showing 8): ${blocked.slice(0, 8).join(", ")}`,
    );
  }

  const topic = pickSeasonalTopic(candidates, new Set(), new Date());

  const violation = wouldViolateTopicDiversity(topic, topicHistory);
  if (violation.blocked) {
    console.warn(
      `Topic pick ${topic.id} would cluster (${violation.reason}) — picking from broader pool`,
    );
    const fallback = sortByFreshness(
      POST_TOPICS.filter(
        (t) =>
          formatAvailable(t) &&
          !wouldViolateTopicDiversity(t, topicHistory).blocked,
      ),
      coverage,
      recentlyUsed,
    );
    if (fallback.length > 0) {
      const alt = pickSeasonalTopic(fallback, new Set(), new Date());
      state.topicIndex =
        (POST_TOPICS.findIndex((t) => t.id === alt.id) + 1) % POST_TOPICS.length;
      state.usedTopicIds = [...(state.usedTopicIds ?? []), alt.id].slice(-30);
      recordTopicPick(state, alt);
      return alt;
    }
  }

  state.topicIndex =
    (POST_TOPICS.findIndex((t) => t.id === topic.id) + 1) % POST_TOPICS.length;
  state.usedTopicIds = [...(state.usedTopicIds ?? []), topic.id].slice(-30);
  recordTopicPick(state, topic);
  return topic;
}

export function getTopicById(id) {
  return POST_TOPICS.find((t) => t.id === id) ?? null;
}
