import fs from "fs";
import path from "path";
import { countDrafts } from "./posts-fs.mjs";
import { pickTopic } from "./topics.mjs";
import { loadState, saveState } from "./state.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";
import { getTemplatePath, pickContentProfile } from "../lib/content-profiles.mjs";
import { getActiveSeasonalEvents, getCurrentSeason } from "../lib/season-topics.mjs";
import {
  formatOutlineForPrompt,
  prepareDraftStrategy,
} from "../lib/guardian/content-strategy.mjs";
import { loadEnvFile } from "../lib/load-env.mjs";

const REQUEST_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "cursor-draft-request.json",
);

const FORCE_MODE_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "force-next-writing-mode.json",
);

function consumeForceWritingMode() {
  if (!fs.existsSync(FORCE_MODE_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(FORCE_MODE_PATH, "utf8"));
    if (data.consumed) return null;
    const mode = data.writingMode;
    if (mode !== "stable" && mode !== "benchmark") return null;
    fs.writeFileSync(
      FORCE_MODE_PATH,
      `${JSON.stringify({ ...data, consumed: true, consumedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    return mode;
  } catch {
    return null;
  }
}

export function readCursorDraftRequest() {
  if (!fs.existsSync(REQUEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(REQUEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

function buildInstructions(strategy, season, events) {
  const { contentProfile, writingMode, toneVariant } = strategy;
  const templatePath = getTemplatePath(contentProfile);
  const eventLabel = events.map((e) => e.label).join(", ") || "none";

  let instructions =
    `Write one bilingual draft (en+ko, draft:true) with contentProfile:${contentProfile}. ` +
    `Writing mode: ${writingMode}. Tone: ${toneVariant}. ` +
    `Follow ${templatePath} and docs/CONTENT_STANDARDS.md. ` +
    `Season priority: ${season}; active events: ${eventLabel}. `;

  if (writingMode === "benchmark" && strategy.outline) {
    instructions +=
      "Use the benchmark outline in this request (outline-first). Paraphrase all sections; never copy SERP text. ";
  }

  instructions += "Run npm run content:validate, then set status to complete.";
  return instructions;
}

async function buildQueuedRequest(publishedSlug, existing = null, options = {}) {
  loadEnvFile();

  const state = loadState();
  const contentProfile = existing?.contentProfile ?? pickContentProfile(state);
  const topic = pickTopic(state, { contentProfile });
  const forcedMode =
    options.forceWritingMode ?? consumeForceWritingMode() ?? undefined;
  const strategy = await prepareDraftStrategy(state, topic, {
    contentProfile,
    writingMode: forcedMode,
  });
  saveState(state);

  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents();
  const templatePath = getTemplatePath(strategy.contentProfile);

  return {
    status: "pending",
    needed: Math.min(1, TARGET_DRAFT_COUNT - countDrafts()),
    publishedSlug: publishedSlug ?? existing?.publishedSlug ?? null,
    requestedAt: existing?.requestedAt ?? new Date().toISOString(),
    ...(existing?.requeuedAt ? {} : {}),
    writingMode: strategy.writingMode,
    contentProfile: strategy.contentProfile,
    toneVariant: strategy.toneVariant,
    serpKeyword: strategy.keyword,
    serpCachePath: strategy.serpCachePath,
    benchmarkOutline: strategy.outline,
    fallbackFrom: strategy.fallbackFrom,
    fallbackReason: strategy.fallbackReason,
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
    templatePath,
    instructions: buildInstructions(strategy, season, events),
    lastError: null,
  };
}

/**
 * Plan A: after publish, queue a Cursor (not OpenAI) draft replenish signal.
 */
export async function queueCursorDraftReplenish(publishedSlug) {
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

  const request = await buildQueuedRequest(publishedSlug);
  writeRequest(request);

  console.log(
    `Cursor draft replenish queued: ${needed} needed, topic=${request.topic.id}, ` +
      `profile=${request.contentProfile}, mode=${request.writingMode}, season=${request.season}` +
      (request.fallbackReason ? ` (fallback: ${request.fallbackReason})` : ""),
  );
  return true;
}

/** Queue Cursor replenish when buffer is below target and no request is in flight. */
export async function ensureDraftReplenishQueued(publishedSlug = null) {
  if (process.env.AUTOMATION_MODE !== "publish-only") {
    return false;
  }

  const draftCount = countDrafts();
  if (draftCount >= TARGET_DRAFT_COUNT) {
    return false;
  }

  const existing = readCursorDraftRequest();
  if (existing?.status === "pending") {
    return false;
  }

  return queueCursorDraftReplenish(publishedSlug);
}

/** Force the next queued/re-queued draft to use benchmark (B-type) Serper outline. */
export async function queueBenchmarkReplenish(publishedSlug = null) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;
  if (needed <= 0) {
    console.log(`Draft buffer full (${draftCount}/${TARGET_DRAFT_COUNT})`);
    return false;
  }

  const existing = readCursorDraftRequest();
  const request = await buildQueuedRequest(
    publishedSlug ?? existing?.publishedSlug ?? null,
    existing,
    { forceWritingMode: "benchmark" },
  );
  writeRequest(request);

  console.log(
    `Benchmark replenish queued: topic=${request.topic.id}, profile=${request.contentProfile}, ` +
      `keyword=${request.serpKeyword ?? "n/a"}, sections=${request.benchmarkOutline?.sections?.length ?? 0}`,
  );
  return request;
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

export function saveCursorDraftRequest(request) {
  writeRequest(request);
}

/** Re-queue after partial replenish (buffer still below target). */
export async function requeueCursorDraftReplenish(publishedSlug = null) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;
  if (needed <= 0) {
    completeCursorDraftRequest(null);
    return false;
  }

  const existing = readCursorDraftRequest();
  const request = await buildQueuedRequest(
    publishedSlug ?? existing?.publishedSlug ?? null,
    existing,
  );
  request.requeuedAt = new Date().toISOString();
  writeRequest(request);

  console.log(
    `Cursor draft replenish re-queued: ${needed} still needed, topic=${request.topic.id}, mode=${request.writingMode}`,
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

export { formatOutlineForPrompt };
