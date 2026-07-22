import fs from "fs";
import path from "path";
import { countDrafts, assertDraftPublishReady, validateDraftPublishEligible, countPublishEligibleDrafts, listDrafts, slugExists } from "./posts-fs.mjs";
import { pickContentPlan, describeContentPlanMix } from "../lib/pick-content-plan.mjs";
import { isMetaTopicId } from "../lib/content-angles.mjs";
import { kstDateString, loadState, saveState } from "./state.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";
import { getTemplatePath, pickContentProfile } from "../lib/content-profiles.mjs";
import { getActiveSeasonalEvents, getCurrentSeason } from "../lib/season-topics.mjs";
import {
  formatOutlineForPrompt,
  prepareDraftStrategy,
} from "../lib/guardian/content-strategy.mjs";
import { loadEnvFile } from "../lib/load-env.mjs";

/**
 * Meta angles often reuse the same slugHint as an already-published post.
 * Force a unique candidate so Cursor/OpenAI replenish cannot overwrite live content.
 */
export function ensureUniqueSlugHint(base) {
  if (!base || typeof base !== "string") return base;
  let slug = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return base;
  if (!slugExists(slug)) return slug;

  const day = kstDateString().replace(/-/g, "");
  let candidate = `${slug}-${day}`;
  if (!slugExists(candidate)) return candidate;

  let n = 2;
  while (slugExists(`${candidate}-v${n}`)) n += 1;
  return `${candidate}-v${n}`;
}

/** Rewrite instructions + slugHint when the suggested slug already exists. */
export function uniquifyPendingRequestSlug(request) {
  if (!request || request.status !== "pending" || !request.slugHint) {
    return { request, changed: false };
  }
  const unique = ensureUniqueSlugHint(request.slugHint);
  if (unique === request.slugHint) {
    return { request, changed: false };
  }
  const escaped = request.slugHint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const instructions = String(request.instructions ?? "").replace(
    new RegExp(escaped, "g"),
    unique,
  );
  return {
    request: { ...request, slugHint: unique, instructions },
    changed: true,
    from: request.slugHint,
    to: unique,
  };
}

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

function buildInstructions(strategy, season, events, plan = null) {
  const { contentProfile, writingMode, toneVariant } = strategy;
  const templatePath = getTemplatePath(contentProfile);
  const eventLabel = events.map((e) => e.label).join(", ") || "none";

  let instructions =
    `Write one bilingual draft (en+ko, draft:true) with contentProfile:${contentProfile}. ` +
    `Writing mode: ${writingMode}. Tone: ${toneVariant}. ` +
    `Follow ${templatePath} and docs/CONTENT_STANDARDS.md. ` +
    `Season priority: ${season}; active events: ${eventLabel}. `;

  if (plan?.kind === "meta" && plan.angle) {
    instructions +=
      `CROSS-CATEGORY ANGLE (${plan.angle.type}): ${plan.angle.label.en} / ${plan.angle.label.ko}. ` +
      `Cover multiple product categories in ONE article — anchor categories: ${plan.angle.anchorTopicIds.join(", ")}. ` +
      `Do NOT write a single-product deep dive; each section compares categories for this household/price/capacity theme. ` +
      `Suggested slug: ${plan.slugHint ?? "2026-" + plan.angle.slugStem + "-" + contentProfile}. ` +
      `Frontmatter: contentAngle: ${plan.angle.id}, topicId: meta-${plan.angle.id}. `;
  }

  if (writingMode === "benchmark" && strategy.outline) {
    instructions +=
      "Use the benchmark outline in this request (outline-first). Paraphrase all sections; never copy SERP text. ";
  }

  instructions +=
    'Publish-ready before complete: description 50–160 chars (en+ko), "## FAQ" / "## 자주 묻는 질문" with ≥3 ### Q&A pairs (profile minimum), coverImage on disk, profile template sections. ' +
    'Cover: never copy another post cover. If no local PEXELS/PIXABAY keys, omit coverImage, push, let GHA "Fetch missing draft covers" run (repo Secrets), then git pull. ' +
    'Draft frontmatter: set createdAt to now; date = today KST (publish overwrites at go-live) — never future date on buffer drafts. ' +
    'Run `npm run content:integrity:repair` (or `node scripts/check-integrity.mjs {slug} --draft --repair`) — must pass with zero errors. ' +
    'Do NOT use `npm run content:validate` alone (published posts only). Then set status to complete.';
  return instructions;
}

async function buildQueuedRequest(publishedSlug, existing = null, options = {}) {
  loadEnvFile();

  const state = loadState();
  const plan = pickContentPlan(state, {
    contentProfile: options.forceProduct ? undefined : existing?.contentProfile,
    forceMeta: options.forceMeta,
    forceProduct: options.forceProduct,
  });
  const contentProfile = plan.contentProfile ?? pickContentProfile(state);
  const topic = plan.topic;
  console.log(`Content plan: ${describeContentPlanMix(state)}`);
  const forcedMode =
    options.forceWritingMode ??
    consumeForceWritingMode() ??
    (plan.kind === "meta" ? "benchmark" : undefined);
  const strategy = await prepareDraftStrategy(state, topic, {
    contentProfile,
    writingMode: forcedMode,
  });
  saveState(state);

  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents();
  const templatePath = getTemplatePath(strategy.contentProfile);
  const rawSlugHint = plan.slugHint ?? null;
  const slugHint = rawSlugHint ? ensureUniqueSlugHint(rawSlugHint) : null;
  if (rawSlugHint && slugHint !== rawSlugHint) {
    console.log(`Slug hint uniquified at queue: ${rawSlugHint} → ${slugHint}`);
  }
  const planForInstructions =
    slugHint && plan
      ? { ...plan, slugHint }
      : plan;

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
    contentPlan: plan.kind,
    contentAngle: plan.angle?.id ?? null,
    slugHint,
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
      seasons: topic.seasons,
      anchorTopicIds: topic.anchorTopicIds ?? null,
      isMetaAngle: Boolean(topic.isMetaAngle),
    },
    templatePath,
    instructions: buildInstructions(strategy, season, events, planForInstructions),
    lastError: null,
  };
}

/**
 * Plan A: after publish, queue a Cursor (not OpenAI) draft replenish signal.
 */
export async function queueCursorDraftReplenish(publishedSlug) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;
  const publishEligible = countPublishEligibleDrafts();

  if (needed <= 0) {
    if (publishEligible === 0 && draftCount > 0) {
      return queuePublishUnblockReplenish("buffer-full-no-publish-eligible");
    }

    const existing = readCursorDraftRequest();
    if (existing?.status === "pending" && !existing.unblockReason) {
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
    `Cursor draft replenish queued: ${needed} needed, plan=${request.contentPlan ?? "product"}, topic=${request.topic.id}, ` +
      `profile=${request.contentProfile}, mode=${request.writingMode}, season=${request.season}` +
      (request.fallbackReason ? ` (fallback: ${request.fallbackReason})` : ""),
  );
  return true;
}

/**
 * Queue a product-topic draft when the buffer is full but nothing can publish
 * (e.g. consecutive cross-cutting meta drafts after a meta publish streak).
 */
export async function queuePublishUnblockReplenish(reason = "topic-diversity") {
  const existing = readCursorDraftRequest();
  if (existing?.status === "pending") {
    console.log(`Publish unblock skipped: replenish already pending (${existing.unblockReason ?? "buffer"})`);
    return false;
  }

  const request = await buildQueuedRequest(
    existing?.publishedSlug ?? null,
    existing,
    { forceProduct: true },
  );
  request.needed = 1;
  request.unblockReason = reason;
  request.note =
    `Publish unblock (${reason}): product topic required — buffer may exceed ${TARGET_DRAFT_COUNT} until slot clears`;
  writeRequest(request);

  console.log(
    `Publish unblock replenish queued: reason=${reason}, topic=${request.topic.id}, profile=${request.contentProfile}`,
  );
  return request;
}

/** When publish slot is due but no draft passes publish-phase gates, queue product replenish. */
export async function ensurePublishableDraftBuffer() {
  const drafts = listDrafts();
  if (drafts.length === 0) {
    return ensureDraftReplenishQueued(null);
  }

  if (countPublishEligibleDrafts(drafts) > 0) {
    return false;
  }

  return queuePublishUnblockReplenish("no-publish-eligible-drafts");
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
  if (writtenSlug) {
    assertDraftPublishReady(writtenSlug);
    const publishIssues = validateDraftPublishEligible(writtenSlug);
    if (publishIssues.length > 0) {
      throw new Error(
        `Draft "${writtenSlug}" would fail publish slot:\n${publishIssues.map((i) => `  • ${i}`).join("\n")}`,
      );
    }
  }
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

export function recordReplenishFailure(message, extra = {}) {
  const existing = readCursorDraftRequest();
  if (!existing) return;
  const at = new Date().toISOString();
  writeRequest({
    ...existing,
    status: "pending",
    lastError: String(message).slice(0, 2000),
    lastAttemptAt: at,
    lastFailure: {
      at,
      message: String(message).slice(0, 2000),
      ...extra,
    },
  });
  console.error(`Draft replenish failed (will retry): ${message}`);
}

function writeRequest(data) {
  fs.mkdirSync(path.dirname(REQUEST_PATH), { recursive: true });
  fs.writeFileSync(REQUEST_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export { formatOutlineForPrompt };
