/**
 * Self-healing checks before publish-slot runs.
 * Detects overdue slots, blocked drafts, stale replenish — records to state.json.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { validatePostFiles, countPublishableDrafts, isDraftDeferred, readPost } from "../automation/posts-fs.mjs";
import { kstDateString, loadState, resetDailyCounters } from "../automation/state.mjs";
import { inferPostTopic } from "./infer-post-topic.mjs";
import {
  checkHomepageFeaturedOrder,
  repairPublishedAtFromHistory,
  repairMissingPublishedAt,
} from "./post-timestamps.mjs";
import {
  MAX_PUBLISH_PER_DAY,
  reconcileStaleCatchUpSlot,
  TARGET_DRAFT_COUNT,
} from "./publish-schedule.mjs";

const STALE_REPLENISH_MS = 2 * 60 * 60 * 1000;
const OVERDUE_WARN_MS = 10 * 60 * 1000;

function readCursorDraftRequest(root) {
  const filePath = path.join(root, "data", "automation", "cursor-draft-request.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function countTopicDuplicates(drafts, root) {
  const byTopic = new Map();
  for (const draft of drafts) {
    let topicId = draft.slug;
    const enPath = path.join(root, "content", "posts", draft.slug, "en.md");
    if (fs.existsSync(enPath)) {
      try {
        const { data } = matter(fs.readFileSync(enPath, "utf8"));
        topicId = inferPostTopic(draft.slug, data).id;
      } catch {
        topicId = draft.slug;
      }
    }
    byTopic.set(topicId, (byTopic.get(topicId) ?? 0) + 1);
  }
  return [...byTopic.entries()].filter(([, count]) => count > 1);
}

/**
 * @param {object} options
 * @param {ReturnType<typeof loadState>} [options.state]
 * @param {Array<{ slug: string }>} [options.drafts]
 * @param {string} [options.root]
 */
export function runAutomationHealthCheck(options = {}) {
  const root = options.root ?? process.cwd();
  const state = options.state ?? loadState();
  const drafts = options.drafts ?? [];
  const now = new Date();
  const nowMs = now.getTime();

  resetDailyCounters(state);

  const issues = [];
  const repairs = [];
  let stateChanged = false;

  const todayKst = kstDateString(now);
  const underDailyCap = state.publishCountToday < MAX_PUBLISH_PER_DAY;
  const nextAt =
    state.nextPublishAt != null ? new Date(state.nextPublishAt).getTime() : null;

  if (underDailyCap && nextAt != null && nextAt <= nowMs) {
    const overdueMin = Math.floor((nowMs - nextAt) / 60_000);
    issues.push({
      code: "overdue-publish-slot",
      message: `Publish slot overdue by ${overdueMin}min (KST ${todayKst})`,
      severity: overdueMin >= OVERDUE_WARN_MS / 60_000 ? "error" : "warning",
    });

    state.scheduledGapHours = 0;
    if (overdueMin >= 15) {
      state.nextPublishAt = now.toISOString();
      repairs.push("forced-catch-up-slot");
    } else {
      repairs.push("marked-slot-catch-up");
    }
    stateChanged = true;
  }

  if (reconcileStaleCatchUpSlot(state, now)) {
    repairs.push("reconciled-stale-catch-up-gap");
    stateChanged = true;
  }

  const blockedDrafts = [];
  const deferredDrafts = [];
  const misleadingFutureDates = [];
  for (const draft of drafts) {
    if (isDraftDeferred(draft.slug)) {
      deferredDrafts.push(draft.slug);
      continue;
    }
    const { data } = readPost(draft.slug, "en");
    const displayDate = String(data.date ?? "").slice(0, 10);
    const todayKstForDraft = kstDateString();
    if (
      data.draft &&
      displayDate > todayKstForDraft &&
      !data.publishAfter &&
      !data.scheduledPublishDate
    ) {
      misleadingFutureDates.push({ slug: draft.slug, date: displayDate });
    }
    try {
      const draftIssues = validatePostFiles(draft.slug, {
        phase: "publish",
        state,
        applyRepair: true,
      });
      if (draftIssues.length > 0) {
        blockedDrafts.push({ slug: draft.slug, issues: draftIssues });
      }
    } catch (error) {
      issues.push({
        code: "draft-health-crash",
        message: `Health check crashed on ${draft.slug}: ${error.message}`,
        severity: "warning",
      });
    }
  }

  if (blockedDrafts.length > 0) {
    issues.push({
      code: "draft-integrity-issues",
      message: `${blockedDrafts.length} draft(s) have publish gate issues`,
      blockedDrafts: blockedDrafts.map((b) => ({
        slug: b.slug,
        issues: b.issues.slice(0, 5),
      })),
      severity: "warning",
    });
  }

  if (misleadingFutureDates.length > 0) {
    issues.push({
      code: "draft-future-display-date",
      message:
        "Buffer draft(s) have future frontmatter date — ignored at publish; use publishAfter only to defer",
      slugs: misleadingFutureDates,
      severity: "warning",
    });
  }

  if (
    drafts.length > 0 &&
    deferredDrafts.length === drafts.length &&
    underDailyCap &&
    nextAt != null &&
    nextAt <= nowMs
  ) {
    issues.push({
      code: "all-drafts-deferred",
      message: `All ${drafts.length} buffer draft(s) have publishAfter in the future — slot cannot publish`,
      slugs: deferredDrafts,
      severity: "error",
    });
  } else if (deferredDrafts.length > 0 && countPublishableDrafts(drafts) === 0) {
    issues.push({
      code: "no-publishable-drafts",
      message: `No publishable drafts (${deferredDrafts.length} deferred)`,
      severity: "warning",
    });
  }

  if (
    drafts.length > 0 &&
    blockedDrafts.length === countPublishableDrafts(drafts) &&
    countPublishableDrafts(drafts) > 0 &&
    underDailyCap &&
    nextAt != null &&
    nextAt <= nowMs
  ) {
    issues.push({
      code: "all-drafts-blocked-at-slot",
      message:
        "Every queued draft failed integrity — publish cannot proceed until drafts are repaired",
      severity: "error",
    });
  }

  if (drafts.length < TARGET_DRAFT_COUNT && underDailyCap) {
    issues.push({
      code: "low-draft-buffer",
      message: `Draft buffer ${drafts.length}/${TARGET_DRAFT_COUNT}`,
      severity: "info",
    });
  }

  const dupTopics = countTopicDuplicates(drafts, root);
  if (dupTopics.length > 0) {
    issues.push({
      code: "duplicate-topic-drafts",
      message: `Duplicate topic drafts: ${dupTopics.map(([t, c]) => `${t}×${c}`).join(", ")}`,
      severity: "error",
    });
  }

  const timestampRepairs = repairPublishedAtFromHistory(root, state);
  if (timestampRepairs.length > 0) {
    for (const repair of timestampRepairs) {
      repairs.push(repair);
    }
    stateChanged = true;
  }

  const missingPublishedRepairs = repairMissingPublishedAt(root);
  if (missingPublishedRepairs.length > 0) {
    repairs.push(...missingPublishedRepairs);
    stateChanged = true;
  }

  const homepageOrder = checkHomepageFeaturedOrder(root, state);
  if (!homepageOrder.ok && homepageOrder.expectedSlug) {
    issues.push({
      code: "homepage-featured-mismatch",
      message: `Home featured is ${homepageOrder.featuredSlug}, expected latest ${homepageOrder.expectedSlug}`,
      severity: "warning",
    });
    if (timestampRepairs.length === 0) {
      const retryRepairs = repairPublishedAtFromHistory(root, state);
      if (retryRepairs.length > 0) {
        repairs.push(...retryRepairs);
        stateChanged = true;
      }
    }
  }

  const cursorRequest = readCursorDraftRequest(root);
  if (cursorRequest?.status === "pending") {
    const since = cursorRequest.requestedAt
      ? new Date(cursorRequest.requestedAt).getTime()
      : null;
    if (since != null && nowMs - since > STALE_REPLENISH_MS) {
      issues.push({
        code: "stale-cursor-replenish",
        message: `Cursor replenish pending ${Math.floor((nowMs - since) / 60_000)}min`,
        severity: "warning",
      });
    }
  }

  state.lastHealthCheck = {
    at: now.toISOString(),
    issueCount: issues.length,
    issues: issues.map(({ code, message, severity }) => ({
      code,
      message,
      severity: severity ?? "info",
    })),
    repairs,
  };
  stateChanged = true;

  return { issues, repairs, stateChanged, state };
}

export function logAutomationHealthResult({ issues, repairs }) {
  if (repairs.length > 0) {
    console.log(`Automation health: ${repairs.length} auto-repair(s)`);
    for (const repair of repairs) {
      console.log(`  · ${repair}`);
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter(
    (i) => i.severity === "warning" || i.severity === "error",
  );

  if (errors.length > 0) {
    console.error(`Automation health: ${errors.length} error(s)`);
    for (const issue of errors) {
      console.error(`  ERROR [${issue.code}]: ${issue.message}`);
    }
  } else if (warnings.length > 0) {
    console.warn(`Automation health: ${warnings.length} warning(s)`);
    for (const issue of warnings) {
      console.warn(`  WARN [${issue.code}]: ${issue.message}`);
    }
  }
}
