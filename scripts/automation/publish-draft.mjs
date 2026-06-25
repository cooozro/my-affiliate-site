import { requestGoogleIndexing, requestSitemapPing } from "./google-indexing.mjs";
import {
  listDrafts,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { maintainDraftBuffer } from "./generate-draft.mjs";
import {
  kstDateString,
  kstNow,
  loadState,
  resetDailyCounters,
  saveState,
} from "./state.mjs";

const MAX_PUBLISH_PER_DAY = 2;
const MIN_PUBLISH_GAP_MS = 6 * 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";

function canPublishNow(state, force = false) {
  resetDailyCounters(state);

  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
    console.log(`Daily publish limit reached (${MAX_PUBLISH_PER_DAY}/day KST)`);
    return false;
  }

  if (force) return true;

  if (state.lastPublishAt) {
    const elapsed = Date.now() - new Date(state.lastPublishAt).getTime();
    if (elapsed < MIN_PUBLISH_GAP_MS) {
      const waitMin = Math.ceil((MIN_PUBLISH_GAP_MS - elapsed) / 60000);
      console.log(`Publish skipped: ${waitMin}min until 6h gap elapsed`);
      return false;
    }
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

  if (!canPublishNow(state, force)) {
    saveState(state);
    return null;
  }

  const drafts = listDrafts();
  if (drafts.length === 0) {
    console.log("No drafts to publish — running buffer maintenance");
    await maintainDraftBuffer();
    saveState(state);
    return null;
  }

  const { slug } = drafts[0];
  const issues = validatePostFiles(slug);
  if (issues.length > 0) {
    throw new Error(`Cannot publish ${slug}:\n${issues.join("\n")}`);
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
  state.history = [
    ...(state.history ?? []),
    { action: "publish", slug, at: state.lastPublishAt, urls },
  ].slice(-50);
  saveState(state);

  await maintainDraftBuffer();
  return slug;
}
