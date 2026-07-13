import { distributePublishedPost } from "./distributor.mjs";
import {
  countPublishedOnKstDate,
  countPublishableDrafts,
  countPublishEligibleDrafts,
  isDraftDeferred,
  listDrafts,
  pickDraftForPublish,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { maintainDraftBuffer } from "./generate-draft.mjs";
import {
  queueCursorDraftReplenish,
  ensureDraftReplenishQueued,
  ensurePublishableDraftBuffer,
} from "./cursor-draft-request.mjs";
import { inferPostTopic } from "../lib/infer-post-topic.mjs";
import {
  logAutomationHealthResult,
  runAutomationHealthCheck,
} from "../lib/automation-health.mjs";
import { runDailyContentAuditIfDue } from "../lib/daily-content-audit-runner.mjs";
import { recordTopicPick } from "../lib/topic-diversity.mjs";
import {
  ensureNextPublishAt,
  formatKst,
  getPublishReadyAt,
  MAX_PUBLISH_PER_DAY,
  MIN_PUBLISH_GAP_HOURS,
  reconcileOverduePublishSlot,
  reconcilePublishSchedule,
  reconcilePublishSlotWithGap,
  reconcileStaleCatchUpSlot,
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
  if (reconcilePublishSchedule(state) || reconcileOverduePublishSlot(state) || reconcileStaleCatchUpSlot(state) || reconcilePublishSlotWithGap(state)) {
    saveState(state);
  }
  ensureNextPublishAt(state);

  if (force) return true;

  const actualToday = countPublishedOnKstDate();
  if (actualToday >= MAX_PUBLISH_PER_DAY) {
    state.publishCountToday = actualToday;
    console.log(
      `Daily publish limit reached (${actualToday} live post(s) today KST, max ${MAX_PUBLISH_PER_DAY})`,
    );
    return false;
  }
  state.publishCountToday = Math.max(state.publishCountToday ?? 0, actualToday);

  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
    console.log(`Daily publish limit reached (${MAX_PUBLISH_PER_DAY}/day KST)`);
    return false;
  }

  const now = Date.now();
  const readyAt = getPublishReadyAt(state).getTime();
  if (now < readyAt) {
    const waitMin = Math.ceil((readyAt - now) / 60_000);
    const gapAt = state.lastPublishAt
      ? new Date(state.lastPublishAt).getTime() +
        MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000
      : 0;
    const slotPast =
      state.nextPublishAt && new Date(state.nextPublishAt).getTime() <= now;
    const gapWaiting = gapAt > now && slotPast;
    console.log(
      gapWaiting
        ? `Publish skipped: slot due but ${MIN_PUBLISH_GAP_HOURS}h gap after last publish (~${waitMin}min left, KST ${formatKst(new Date(readyAt).toISOString())})`
        : `Publish skipped: next slot in ${waitMin}min (KST ${formatKst(new Date(readyAt).toISOString())})`,
    );
    return false;
  }

  const nextAt = new Date(state.nextPublishAt).getTime();
  const overdueMin = Math.floor((now - Math.min(nextAt, readyAt)) / 60_000);
  if (overdueMin >= 1) {
    console.log(
      `Catch-up publish: ready ${overdueMin}min after scheduled slot (KST ${formatKst(state.nextPublishAt)}).`,
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
  const drafts = listDrafts();

  try {
    const health = runAutomationHealthCheck({ state, drafts });
    logAutomationHealthResult(health);
    if (health.stateChanged) {
      saveState(state);
    }
  } catch (error) {
    console.error(`Automation health check failed (non-fatal): ${error.message}`);
  }

  await ensureDraftReplenishQueued(null);
  await ensurePublishableDraftBuffer();

  if (!canPublishNow(state, force)) {
    if (JSON.stringify(state) !== stateBefore) {
      saveState(state);
    }
    runDailyContentAuditIfDue(process.cwd(), { state });
    return null;
  }

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

  const tried = new Set();
  let slug = null;
  let deferredSkipped = 0;
  let integritySkipped = 0;
  let diversitySkipped = 0;

  while (!slug) {
    const candidates = drafts.filter((d) => !tried.has(d.slug));
    if (candidates.length === 0) break;

    const picked = pickDraftForPublish(candidates, state);
    if (!picked) {
      diversitySkipped = candidates.filter((d) => !isDraftDeferred(d.slug)).length;
      console.log(
        `Publish skipped: every queued draft violates topic diversity (max 2 consecutive same topic/category/cluster).`,
      );
      break;
    }

    tried.add(picked.slug);

    if (isDraftDeferred(picked.slug)) {
      const { data } = readPost(picked.slug, "en");
      const deferField = data.publishAfter ?? data.scheduledPublishDate;
      console.log(
        `Publish skipped: ${picked.slug} deferred until ${String(deferField).slice(0, 10)} (publishAfter)`,
      );
      deferredSkipped += 1;
      continue;
    }

    const issues = validatePostFiles(picked.slug, {
      phase: "publish",
      state,
      applyRepair: true,
    });

    if (issues.length > 0) {
      integritySkipped += 1;
      console.error(
        `Integrity gate blocked ${picked.slug} — trying next draft (${issues.length} issue(s)):`,
      );
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
      continue;
    }

    slug = picked.slug;
  }

  if (!slug) {
    const publishable = countPublishableDrafts(drafts);
    const publishEligible = countPublishEligibleDrafts(drafts, state);
    let reason = "integrity-gate";
    let detail =
      `${tried.size} draft(s) failed checks — fix drafts or wait for replenish.`;

    if (diversitySkipped > 0 && integritySkipped === 0) {
      reason = "topic-diversity";
      detail = `${diversitySkipped} draft(s) blocked by topic diversity — product-topic replenish required.`;
      await ensurePublishableDraftBuffer();
    } else if (deferredSkipped > 0 && integritySkipped === 0 && deferredSkipped === tried.size) {
      reason = "all-deferred";
      detail = `${deferredSkipped} draft(s) have publishAfter in the future — none eligible today.`;
    } else if (publishEligible === 0 && drafts.length > 0 && deferredSkipped === 0) {
      reason = "no-publish-eligible-drafts";
      detail = `${drafts.length} draft(s) in buffer but none pass publish slot gates.`;
      await ensurePublishableDraftBuffer();
    } else if (integritySkipped > 0) {
      detail = `${integritySkipped} draft(s) failed integrity gate.`;
    }

    console.log(`Publish skipped: ${detail}`);
    state.lastPublishSkipReason = {
      at: new Date().toISOString(),
      reason,
      triedSlugs: [...tried],
      deferredSkipped,
      integritySkipped,
      diversitySkipped,
      publishableCount: publishable,
      publishEligibleCount: publishEligible,
    };
    saveState(state);
    return null;
  }

  const { data: enData } = readPost(slug, "en");
  const topic = inferPostTopic(slug, enData);

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
      topic: {
        id: topic.id,
        category: topic.category,
        cluster: topic.cluster,
      },
      at: state.lastPublishAt,
      urls: [
        `${SITE_URL}/en/blog/${slug}`,
        `${SITE_URL}/ko/blog/${slug}`,
      ],
    },
  ].slice(-50);

  recordTopicPick(state, {
    id: topic.id,
    category: topic.category,
    topicCluster: topic.cluster,
  });

  saveState(state);

  await queueCursorDraftReplenish(slug);
  console.log(
    "Hybrid content strategy queued: next draft uses A/B (stable vs Serper benchmark) automatically.",
  );

  runDailyContentAuditIfDue(process.cwd(), { state });

  return slug;
}
