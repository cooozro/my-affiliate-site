import { requestGoogleIndexing, requestSitemapPing } from "./google-indexing.mjs";
import {
  listDrafts,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { maintainDraftBuffer, replenishAfterPublish } from "./generate-draft.mjs";
import {
  ensureNextPublishAt,
  formatKst,
  MAX_PUBLISH_PER_DAY,
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
  ensureNextPublishAt(state);

  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
    console.log(`Daily publish limit reached (${MAX_PUBLISH_PER_DAY}/day KST)`);
    return false;
  }

  if (force) return true;

  const nextAt = new Date(state.nextPublishAt).getTime();
  if (Date.now() < nextAt) {
    const waitMin = Math.ceil((nextAt - Date.now()) / 60000);
    console.log(
      `Publish skipped: next random slot in ${waitMin}min (KST ${formatKst(state.nextPublishAt)})`,
    );
    return false;
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

  const urls = [
    `${SITE_URL}/en/blog/${slug}`,
    `${SITE_URL}/ko/blog/${slug}`,
  ];

  for (const url of urls) {
    try {
      await requestGoogleIndexing(url);
      console.log(`Indexing requested: ${url}`);
    } catch (error) {
      console.warn(`Indexing failed for ${url}: ${error.message}`);
    }
  }

  try {
    await requestSitemapPing();
  } catch (error) {
    console.warn(`Sitemap ping failed: ${error.message}`);
  }

  state.lastPublishAt = new Date().toISOString();
  state.publishCountToday += 1;
  scheduleNextPublishAfterSuccess(state);
  console.log(
    `Next publish scheduled at KST ${formatKst(state.nextPublishAt)} (${state.scheduledGapHours}h gap)`,
  );

  const remainingDrafts = listDrafts().length;
  if (remainingDrafts < TARGET_DRAFT_COUNT && !process.env.OPENAI_API_KEY) {
    console.log(
      `Draft buffer ${remainingDrafts}/${TARGET_DRAFT_COUNT} — set OPENAI_API_KEY to auto-replenish after publish.`,
    );
  }

  state.history = [
    ...(state.history ?? []),
    { action: "publish", slug, at: state.lastPublishAt, urls },
  ].slice(-50);
  saveState(state);

  const created = await replenishAfterPublish();
  if (created > 0) {
    console.log(`Replenished ${created} draft(s); buffer now ${listDrafts().length}/${TARGET_DRAFT_COUNT}`);
  }

  return slug;
}
