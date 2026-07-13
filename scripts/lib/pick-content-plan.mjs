/**
 * Unified content plan picker — single product OR cross-cutting meta angle.
 */

import { pickTopic } from "../automation/topics.mjs";
import { getTopicFormatCoverage } from "./topic-coverage.mjs";
import { getRoadmapPhase, tier1FirstPassComplete } from "./content-roadmap.mjs";
import { getTopicHistory } from "./topic-diversity.mjs";
import { getPublishTopicHistory } from "./infer-post-topic.mjs";
import { wouldViolateTopicDiversity } from "./topic-diversity.mjs";
import { pickContentProfile, CONTENT_PROFILES } from "./content-profiles.mjs";
import { getCurrentSeason } from "./season-topics.mjs";
import {
  listMetaAnglesForSeason,
  metaAngleToTopic,
  suggestedSlugForAngle,
} from "./content-angles.mjs";

/** Share of picks that should be cross-cutting meta angles (not single SKU). */
export const META_ANGLE_RATIOS = {
  "tier1-first-pass": 0.3,
  "tier2-first-pass": 0.5,
  "format-rotation": 0.6,
};

function metaAngleHistory(state) {
  return state.metaAngleHistory ?? [];
}

function trailingMetaCount(state, angleId) {
  const history = metaAngleHistory(state);
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].id === angleId) count += 1;
    else break;
  }
  return count;
}

function recentSingleProductStreak(state) {
  const used = state.usedTopicIds ?? [];
  let streak = 0;
  for (let i = used.length - 1; i >= 0; i--) {
    const id = used[i];
    if (String(id).startsWith("meta-")) break;
    streak += 1;
  }
  return streak;
}

/** Meta angles publish as cross-cutting — blocked after 2 consecutive same category. */
export function metaPublishWouldViolateDiversity(state) {
  const history = getPublishTopicHistory(state);
  return wouldViolateTopicDiversity(
    { id: "meta-angle", category: "cross-cutting" },
    history,
  ).blocked;
}

/**
 * @param {object} state
 * @param {import('./topic-coverage.mjs').getTopicFormatCoverage extends Function ? ReturnType<import('./topic-coverage.mjs').getTopicFormatCoverage> : never} coverage
 */
export function shouldPickMetaAngle(state, coverage) {
  const phase = getRoadmapPhase(coverage);
  const ratio = META_ANGLE_RATIOS[phase] ?? 0.45;

  if (recentSingleProductStreak(state) >= 4) {
    console.log("Content plan: forcing meta angle after 4+ single-product picks");
    return true;
  }

  if (tier1FirstPassComplete(coverage) && phase === "tier1-first-pass") {
    return Math.random() < 0.4;
  }

  return Math.random() < ratio;
}

/**
 * @param {object} state
 * @param {{ contentProfile?: string, forceMeta?: boolean }} [options]
 */
export function pickMetaAngle(state, options = {}) {
  const season = getCurrentSeason();
  const contentProfile = options.contentProfile ?? pickContentProfile(state);
  let candidates = listMetaAnglesForSeason(season).filter(
    (a) => !a.allowedFormats || a.allowedFormats.includes(contentProfile),
  );

  if (candidates.length === 0) {
    candidates = [...listMetaAnglesForSeason(season)];
  }

  const history = metaAngleHistory(state);
  const usedIds = new Set(history.slice(-8).map((e) => e.id));

  candidates = candidates
    .filter((a) => trailingMetaCount(state, a.id) < 2)
    .sort((a, b) => {
      const aUsed = usedIds.has(a.id) ? 1 : 0;
      const bUsed = usedIds.has(b.id) ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed;
      return 0;
    });

  if (candidates.length === 0) {
    candidates = listMetaAnglesForSeason(season);
  }

  const angle = candidates[Math.floor(Math.random() * candidates.length)];
  const topic = metaAngleToTopic(angle);

  state.metaAngleHistory = [
    ...history,
    { id: angle.id, type: angle.type, at: new Date().toISOString() },
  ].slice(-20);

  const slugHint = suggestedSlugForAngle(angle, contentProfile);
  console.log(
    `Meta angle picked: ${angle.id} (${angle.type}) — ${angle.label.en}; slug hint: ${slugHint}`,
  );

  return { angle, topic, contentProfile, slugHint };
}

export function recordMetaAnglePick(state, angleId, type) {
  state.metaAngleHistory = [
    ...metaAngleHistory(state),
    { id: angleId, type, at: new Date().toISOString() },
  ].slice(-20);
}

/**
 * @param {object} state
 * @param {{ contentProfile?: string, forceMeta?: boolean, forceProduct?: boolean }} [options]
 * @returns {{ kind: 'meta'|'product', topic: object, contentProfile?: string, angle?: object, slugHint?: string }}
 */
export function pickContentPlan(state, options = {}) {
  const coverage = getTopicFormatCoverage();
  const phase = getRoadmapPhase(coverage);
  const contentProfile = options.contentProfile ?? pickContentProfile(state);

  const useMeta =
    !options.forceProduct &&
    (options.forceMeta || shouldPickMetaAngle(state, coverage));

  if (useMeta && !options.forceMeta && metaPublishWouldViolateDiversity(state)) {
    console.log(
      "Content plan: skipping meta angle — cross-cutting already 2x in publish queue (product topic required)",
    );
  }

  if (
    useMeta &&
    !options.forceMeta &&
    !metaPublishWouldViolateDiversity(state)
  ) {
    const meta = pickMetaAngle(state, { contentProfile });
    return {
      kind: "meta",
      angle: meta.angle,
      topic: meta.topic,
      contentProfile: meta.contentProfile,
      slugHint: meta.slugHint,
    };
  }

  const preferredProfile = contentProfile ?? pickContentProfile(state);
  const profilesToTry = [
    preferredProfile,
    ...CONTENT_PROFILES.filter((p) => p !== preferredProfile),
  ];

  let lastError = null;
  for (const profile of profilesToTry) {
    try {
      const topic = pickTopic(state, { contentProfile: profile });
      console.log(`Product topic picked: ${topic.id} (roadmap: ${phase}, profile: ${profile})`);
      return { kind: "product", topic, contentProfile: profile };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`No product topics available in roadmap phase ${phase}`);
}

export function describeContentPlanMix(state) {
  const coverage = getTopicFormatCoverage();
  const phase = getRoadmapPhase(coverage);
  const metaRatio = Math.round((META_ANGLE_RATIOS[phase] ?? 0.45) * 100);
  const topicHistory = getTopicHistory(state);
  const metaCount = metaAngleHistory(state).length;
  return `phase=${phase}, meta pick target ~${metaRatio}%, meta history=${metaCount}, topic history=${topicHistory.length}`;
}
