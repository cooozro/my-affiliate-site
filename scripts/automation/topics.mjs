/**
 * IT review topics for AI Pick & Report.
 * Roadmap phase → season score → diversity.
 */
import { PRODUCT_TOPICS } from "../lib/product-taxonomy.mjs";
import { pickSeasonalTopic } from "../lib/season-topics.mjs";
import {
  getTopicFormatCoverage,
  getClusterFormatCoverage,
  isTopicFormatBlocked,
  isClusterFormatBlocked,
  listBlockedTopicFormats,
  listBlockedClusterFormats,
  topicFormatUsageCount,
  clusterFormatUsageCount,
} from "../lib/topic-coverage.mjs";
import {
  describeRoadmapPhase,
  getRoadmapPhase,
  isTopicBlockedByRoadmap,
} from "../lib/content-roadmap.mjs";
import {
  filterByTopicDiversity,
  filterByTaxonomyGroupSpread,
  getTopicHistory,
  recordTopicPick,
  taxonomyGroupCoveragePenalty,
  wouldViolateTopicDiversity,
  wouldViolateTaxonomyGroupSpread,
} from "../lib/topic-diversity.mjs";

export const POST_TOPICS = PRODUCT_TOPICS;

function supportsFormat(topic, contentProfile) {
  if (!contentProfile) return true;
  return !topic.allowedFormats || topic.allowedFormats.includes(contentProfile);
}

function sortByFreshness(candidates, coverage, clusterCoverage, recentlyUsed, roadmapPhase) {
  return [...candidates].sort((a, b) => {
    if (roadmapPhase === "tier1-first-pass") {
      const taxA = taxonomyGroupCoveragePenalty(a, coverage);
      const taxB = taxonomyGroupCoveragePenalty(b, coverage);
      if (taxA !== taxB) return taxA - taxB;
    }

    const clusterA = a.topicCluster ?? a.cluster;
    const clusterB = b.topicCluster ?? b.cluster;
    const clusterUsageA = clusterA
      ? clusterFormatUsageCount(clusterA, clusterCoverage)
      : 0;
    const clusterUsageB = clusterB
      ? clusterFormatUsageCount(clusterB, clusterCoverage)
      : 0;
    if (clusterUsageA !== clusterUsageB) return clusterUsageA - clusterUsageB;

    const usageA = topicFormatUsageCount(a.id, coverage);
    const usageB = topicFormatUsageCount(b.id, coverage);
    if (usageA !== usageB) return usageA - usageB;

    const recentA = recentlyUsed.has(a.id) ? 1 : 0;
    const recentB = recentlyUsed.has(b.id) ? 1 : 0;
    return recentA - recentB;
  });
}

function formatBlockedFn(topic, contentProfile, coverage, clusterCoverage) {
  return (
    isTopicFormatBlocked(topic.id, contentProfile, coverage) ||
    isClusterFormatBlocked(topic, contentProfile, clusterCoverage)
  );
}

function pickFromCandidates(candidates, recentlyUsed, roadmapPhase) {
  const fresh = candidates.filter((t) => !recentlyUsed.has(t.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  if (roadmapPhase !== "format-rotation") {
    return pickSeasonalTopic(pool, recentlyUsed, new Date(), { lightSeason: true });
  }

  return pickSeasonalTopic(pool, recentlyUsed, new Date());
}

/**
 * Pick next topic — roadmap phase, uncovered lines, then season score.
 * @param {object} state
 * @param {{ contentProfile?: string }} [options]
 */
export function pickTopic(state, options = {}) {
  const contentProfile = options.contentProfile ?? "buying-guide";
  const recentlyUsed = new Set(state.usedTopicIds ?? []);
  const topicHistory = getTopicHistory(state);
  const coverage = getTopicFormatCoverage();
  const clusterCoverage = getClusterFormatCoverage();
  const roadmapPhase = getRoadmapPhase(coverage);

  console.log(
    `Content roadmap: ${roadmapPhase} — ${describeRoadmapPhase(roadmapPhase, coverage)}`,
  );

  const formatAvailable = (t) =>
    supportsFormat(t, contentProfile) &&
    !isTopicBlockedByRoadmap(
      t,
      contentProfile,
      coverage,
      clusterCoverage,
      roadmapPhase,
      formatBlockedFn,
    );

  let candidates = sortByFreshness(
    POST_TOPICS.filter(formatAvailable),
    coverage,
    clusterCoverage,
    recentlyUsed,
    roadmapPhase,
  );

  candidates = filterByTaxonomyGroupSpread(candidates, roadmapPhase, coverage);
  candidates = filterByTopicDiversity(candidates, topicHistory);

  if (candidates.length === 0) {
    candidates = sortByFreshness(
      POST_TOPICS.filter(
        (t) =>
          formatAvailable(t) &&
          !wouldViolateTaxonomyGroupSpread(t, roadmapPhase, coverage).blocked &&
          !wouldViolateTopicDiversity(t, topicHistory).blocked,
      ),
      coverage,
      clusterCoverage,
      recentlyUsed,
      roadmapPhase,
    );
  }

  if (candidates.length === 0) {
    candidates = sortByFreshness(
      POST_TOPICS.filter(
        (t) =>
          formatAvailable(t) &&
          !wouldViolateTopicDiversity(t, topicHistory).blocked,
      ),
      coverage,
      clusterCoverage,
      recentlyUsed,
      roadmapPhase,
    );
  }

  if (candidates.length === 0 && roadmapPhase === "format-rotation") {
    console.warn(
      "No fresh topic×format pairs — relaxing diversity guard for this profile",
    );
    candidates = sortByFreshness(
      POST_TOPICS.filter(formatAvailable),
      coverage,
      clusterCoverage,
      new Set(),
      roadmapPhase,
    );
  }

  if (candidates.length === 0) {
    throw new Error(
      `No topics available for ${contentProfile} in roadmap phase ${roadmapPhase}`,
    );
  }

  const blocked = listBlockedTopicFormats(coverage);
  const blockedClusters = listBlockedClusterFormats(clusterCoverage);
  if (blocked.length > 0 && roadmapPhase === "format-rotation") {
    console.log(
      `Topic×format pool excludes ${blocked.length} existing pair(s) (showing 8): ${blocked.slice(0, 8).join(", ")}`,
    );
  }
  if (blockedClusters.length > 0 && roadmapPhase === "format-rotation") {
    console.log(
      `Cluster×format excludes ${blockedClusters.length} pair(s) (showing 6): ${blockedClusters.slice(0, 6).join(", ")}`,
    );
  }

  let topic = pickFromCandidates(candidates, recentlyUsed, roadmapPhase);

  const violation = wouldViolateTopicDiversity(topic, topicHistory);
  if (violation.blocked) {
    console.warn(
      `Topic pick ${topic.id} would cluster (${violation.reason}) — picking from broader pool`,
    );
    const fallback = sortByFreshness(
      POST_TOPICS.filter(
        (t) =>
          formatAvailable(t) &&
          !wouldViolateTaxonomyGroupSpread(t, roadmapPhase, coverage).blocked &&
          !wouldViolateTopicDiversity(t, topicHistory).blocked,
      ),
      coverage,
      clusterCoverage,
      recentlyUsed,
      roadmapPhase,
    );
    if (fallback.length > 0) {
      topic = pickFromCandidates(fallback, recentlyUsed, roadmapPhase);
    }
  }

  state.topicIndex =
    (POST_TOPICS.findIndex((t) => t.id === topic.id) + 1) % POST_TOPICS.length;
  state.usedTopicIds = [...(state.usedTopicIds ?? []), topic.id].slice(-30);
  state.roadmapPhase = roadmapPhase;
  recordTopicPick(state, topic);
  return topic;
}

export function getTopicById(id) {
  return POST_TOPICS.find((t) => t.id === id) ?? null;
}
