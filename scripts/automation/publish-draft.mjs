import { distributePublishedPost } from "./distributor.mjs";
import {
  listDrafts,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { maintainDraftBuffer } from "./generate-draft.mjs";
import { queueCursorDraftReplenish } from "./cursor-draft-request.mjs";
import {
  ensureNextPublishAt,
  formatKst,
  MAX_PUBLISH_PER_DAY,
  reconcilePublishSchedule,
  scheduleNextPublishAfterSuccess,
  TARGET_DRAFT_COUNT,
} from "../lib/publish-schedule.mjs";
import {
  kstDateString,
  kstNow,
  loadState,
  resetDailyCounters,
  saveState,
} from "./state.mjs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";

function canPublishNow(state, force = false) {
  resetDailyCounters(state);
  if (reconcilePublishSchedule(state)) {
    saveState(state);
  }
  ensureNextPublishAt(state);

  if (force) return true;

  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
    console.log(`Daily publish limit reached (${MAX_PUBLISH_PER_DAY}/day KST)`);
    return false;
  }

  const nextAt = new Date(state.nextPublishAt).getTime();
  const now = Date.now();
  if (now < nextAt) {
    const waitMin = Math.ceil((nextAt - now) / 60000);
    console.log(
      `Publish skipped: next random slot in ${waitMin}min (KST ${formatKst(state.nextPublishAt)})`,
    );
    return false;
  }

  const overdueMin = Math.floor((now - nextAt) / 60000);
  if (overdueMin >= 15) {
    console.log(
      `Catch-up publish: slot was due ${overdueMin}min ago (KST ${formatKst(state.nextPublishAt)}).`,
    );
  }

  return true;
}

function publishSlug(slug) {
  const publishDate = kstDateString();
  const updatedAt = kstNow().toISOString();

  for (const locale of ["en", "ko"]) {
    const { data, content } = readPost(slug, locale);
    const next = {
      ...data,
      draft: false,
      date: publishDate,
      updatedAt,
      publishedAt: updatedAt,
    };
    delete next.createdAt;
    writePost(slug, locale, next, content);
  }
}

export async function publishOneDraft(options = {}) {
  const { force = false } = options;
  const state = loadState();
  const stateBefore = JSON.stringify(state);

  if (!canPublishNow(state, force)) {
    if (JSON.stringify(state) !== stateBefore) {
      saveState(state);
    }
    return null;
  }

  const drafts = listDrafts();
  const publishOnly = process.env.AUTOMATION_MODE === "publish-only";

  if (drafts.length === 0) {
    console.log(
      publishOnly
        ? `No drafts to publish (${drafts.length}/${TARGET_DRAFT_COUNT}). Write drafts in Cursor (draft: true) and push to main.`
        : "No drafts to publish — running buffer maintenance",
    );
    if (!publishOnly) {
      await maintainDraftBuffer();
    }
    saveState(state);
    return null;
  }

  const { slug } = drafts[0];
  const issues = validatePostFiles(slug);
  if (issues.length > 0) {
    throw new Error(
      `Cannot publish ${slug} — Google content self-audit failed:\n${issues.join("\n")}`,
    );
  }

  publishSlug(slug);
  console.log(`Published: ${slug}`);

  try {
    await distributePublishedPost(slug);
  } catch (error) {
    console.warn(`Distribution failed for ${slug}: ${error.message}`);
  }

  state.lastPublishAt = new Date().toISOString();
  state.publishCountToday += 1;
  scheduleNextPublishAfterSuccess(state);
  console.log(
    `Next publish scheduled at KST ${formatKst(state.nextPublishAt)} (${state.scheduledGapHours}h gap)`,
  );

  const remainingDrafts = listDrafts().length;
  if (remainingDrafts < TARGET_DRAFT_COUNT) {
    console.log(
      `Draft buffer ${remainingDrafts}/${TARGET_DRAFT_COUNT} — queuing Cursor draft replenish (Plan A).`,
    );
  }

  state.history = [
    ...(state.history ?? []),
    {
      action: "publish",
      slug,
      at: state.lastPublishAt,
      urls: [
        `${SITE_URL}/en/blog/${slug}`,
        `${SITE_URL}/ko/blog/${slug}`,
      ],
    },
  ].slice(-50);
  saveState(state);

  queueCursorDraftReplenish(slug);

  return slug;
}
