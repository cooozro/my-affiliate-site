import fs from "fs";
import path from "path";
import { countDrafts } from "./posts-fs.mjs";
import { pickTopic } from "./topics.mjs";
import { loadState, saveState } from "./state.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";
import {
  getTemplatePath,
  pickContentProfile,
} from "../lib/content-profiles.mjs";
import { getActiveSeasonalEvents, getCurrentSeason } from "../lib/season-topics.mjs";

const REQUEST_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "cursor-draft-request.json",
);

export function readCursorDraftRequest() {
  if (!fs.existsSync(REQUEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(REQUEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Plan A: after publish, queue a Cursor (not OpenAI) draft replenish signal.
 */
export function queueCursorDraftReplenish(publishedSlug) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;

  if (needed <= 0) {
    const existing = readCursorDraftRequest();
    if (existing?.status === "pending") {
      writeRequest({
        status: "complete",
        completedAt: new Date().toISOString(),
        draftCount,
        note: "Buffer full; cleared stale pending request.",
      });
    }
    console.log(`Draft buffer full (${draftCount}/${TARGET_DRAFT_COUNT})`);
    return false;
  }

  const state = loadState();
  const contentProfile = pickContentProfile(state);
  const topic = pickTopic(state, { contentProfile });
  saveState(state);

  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents();

  writeRequest({
    status: "pending",
    needed,
    publishedSlug,
    requestedAt: new Date().toISOString(),
    contentProfile,
    season,
    seasonalEvents: events.map((e) => e.label),
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
      seasons: topic.seasons,
    },
    templatePath: getTemplatePath(contentProfile),
    instructions:
      `Write one bilingual draft (en+ko, draft:true) with contentProfile:${contentProfile}. ` +
      `Follow ${getTemplatePath(contentProfile)} and docs/CONTENT_STANDARDS.md. ` +
      `Season priority: ${season}; active events: ${events.map((e) => e.label).join(", ") || "none"}. ` +
      `Run npm run content:validate, then set status to complete.`,
  });

  console.log(
    `Cursor draft replenish queued: ${needed} needed, topic=${topic.id}, profile=${contentProfile}, season=${season}`,
  );
  return true;
}

export function completeCursorDraftRequest(writtenSlug) {
  writeRequest({
    status: "complete",
    completedAt: new Date().toISOString(),
    writtenSlug,
    draftCount: countDrafts(),
    lastError: null,
  });
  console.log(`Cursor draft request completed: ${writtenSlug}`);
}

/** Re-queue after partial replenish (buffer still below target). */
export function requeueCursorDraftReplenish(publishedSlug = null) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;
  if (needed <= 0) {
    completeCursorDraftRequest(null);
    return false;
  }

  const existing = readCursorDraftRequest();
  const state = loadState();
  const contentProfile =
    existing?.contentProfile ?? pickContentProfile(state);
  const topic = pickTopic(state, { contentProfile });
  saveState(state);

  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents();

  writeRequest({
    status: "pending",
    needed,
    publishedSlug: publishedSlug ?? existing?.publishedSlug ?? null,
    requestedAt: existing?.requestedAt ?? new Date().toISOString(),
    requeuedAt: new Date().toISOString(),
    contentProfile,
    season,
    seasonalEvents: events.map((e) => e.label),
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
      seasons: topic.seasons,
    },
    templatePath: getTemplatePath(contentProfile),
    instructions:
      `Write one bilingual draft (en+ko, draft:true) with contentProfile:${contentProfile}. ` +
      `Follow ${getTemplatePath(contentProfile)} and docs/CONTENT_STANDARDS.md. ` +
      `Season priority: ${season}; active events: ${events.map((e) => e.label).join(", ") || "none"}. ` +
      `Run npm run content:validate, then set status to complete.`,
    lastError: null,
  });

  console.log(
    `Cursor draft replenish re-queued: ${needed} still needed, topic=${topic.id}`,
  );
  return true;
}

export function recordReplenishAttempt() {
  const existing = readCursorDraftRequest();
  if (!existing || existing.status !== "pending") return;
  writeRequest({
    ...existing,
    lastAttemptAt: new Date().toISOString(),
  });
}

export function recordReplenishFailure(message) {
  const existing = readCursorDraftRequest();
  if (!existing) return;
  writeRequest({
    ...existing,
    status: "pending",
    lastError: message,
    lastAttemptAt: new Date().toISOString(),
  });
  console.error(`Draft replenish failed (will retry): ${message}`);
}

function writeRequest(data) {
  fs.mkdirSync(path.dirname(REQUEST_PATH), { recursive: true });
  fs.writeFileSync(REQUEST_PATH, `${JSON.stringify(data, null, 2)}\n`);
}
