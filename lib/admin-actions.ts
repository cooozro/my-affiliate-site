import "server-only";

import {
  commitPostChanges,
  deletePostOnGithub,
  fetchGaSummary,
  tryReadGithubJson,
} from "@/lib/admin-services";
import {
  assertGithubAdminConfigured,
  deletePostLocally,
  draftPostLocally,
  listPostsForAdmin,
  publishPostLocally,
  readPostFile,
  slugExists,
  usesRemotePostStore,
  type AdminPostRow,
} from "@/lib/posts-admin";
import fs from "fs";
import path from "path";
import {
  MAX_PUBLISH_PER_DAY,
  previewPublishSchedule,
  TARGET_DRAFT_COUNT,
} from "@/lib/publish-schedule";

/** Internal/editorial slugs — not counted toward automation draft buffer. */
const AUTOMATION_DRAFT_EXCLUDE = new Set([
  "welcome",
  "adsense-seo-checklist",
]);

export type AutomationStatus = {
  mode: "publish-only";
  draftCount: number;
  targetDraftCount: number;
  cursorDraftNeeded: number;
  draftLabel: string;
  needsReplenish: boolean;
  replenishNote: string;
  cursorDraftPending: boolean;
  cursorDraftTopic: string | null;
  cursorDraftPendingSince: string | null;
  cursorDraftLastError: string | null;
  nextPublishAt: string | null;
  nextPublishAtKst: string | null;
  scheduledGapHours: number | null;
  gapLabel: string;
  slotOverdue: boolean;
  publishCountToday: number;
  maxPublishPerDay: number;
  lastPublishAt: string | null;
  stateSource: "github" | "bundle";
};

function readLocalJson(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

async function loadAutomationState(): Promise<{
  state: Record<string, unknown>;
  source: "github" | "bundle";
}> {
  const localPath = path.join(process.cwd(), "data", "automation", "state.json");

  if (usesRemotePostStore()) {
    const remote = await tryReadGithubJson("data/automation/state.json");
    if (remote) {
      return { state: remote, source: "github" };
    }
  }

  return {
    state: readLocalJson(localPath) ?? {},
    source: "bundle",
  };
}

async function loadCursorDraftRequest(): Promise<Record<string, unknown> | null> {
  const localPath = path.join(
    process.cwd(),
    "data",
    "automation",
    "cursor-draft-request.json",
  );

  if (usesRemotePostStore()) {
    const remote = await tryReadGithubJson(
      "data/automation/cursor-draft-request.json",
    );
    if (remote) return remote;
  }

  return readLocalJson(localPath);
}

function countAutomationDrafts(posts: AdminPostRow[]): number {
  return posts.filter(
    (post) => post.draft && !AUTOMATION_DRAFT_EXCLUDE.has(post.slug),
  ).length;
}

export async function getAutomationStatus(): Promise<AutomationStatus> {
  const { state, source: stateSource } = await loadAutomationState();
  const schedule = previewPublishSchedule(state);

  const draftCount = countAutomationDrafts(listPostsForAdmin());

  const request = await loadCursorDraftRequest();
  const cursorDraftPending = request?.status === "pending";
  const cursorDraftTopic =
    typeof (request?.topic as { id?: string } | undefined)?.id === "string"
      ? (request?.topic as { id: string }).id
      : null;
  const cursorDraftNeeded =
    cursorDraftPending && typeof request?.needed === "number"
      ? request.needed
      : 0;
  const cursorDraftPendingSince =
    cursorDraftPending && typeof request?.requestedAt === "string"
      ? request.requestedAt
      : null;
  const cursorDraftLastError =
    cursorDraftPending && typeof request?.lastError === "string"
      ? request.lastError
      : null;

  const draftLabel =
    cursorDraftPending && cursorDraftNeeded > 0
      ? `${draftCount} / ${TARGET_DRAFT_COUNT} (+${cursorDraftNeeded} 작성 중)`
      : `${draftCount} / ${TARGET_DRAFT_COUNT}`;

  const replenishNote = cursorDraftPending
    ? `GitHub Actions가 Cursor API로 임시글 보충 중${cursorDraftTopic ? ` (주제: ${cursorDraftTopic})` : ""}. 보통 5–15분.`
    : draftCount < TARGET_DRAFT_COUNT
      ? "임시글 버퍼 부족. 발행 시 GitHub Actions가 Cursor로 자동 보충합니다."
      : "임시글 버퍼 충분. 발행·보충 모두 GitHub Actions에서 PC 없이 실행됩니다.";

  return {
    mode: "publish-only",
    draftCount,
    targetDraftCount: TARGET_DRAFT_COUNT,
    cursorDraftNeeded,
    draftLabel,
    needsReplenish: draftCount < TARGET_DRAFT_COUNT || cursorDraftPending,
    replenishNote,
    cursorDraftPending,
    cursorDraftTopic,
    cursorDraftPendingSince,
    cursorDraftLastError,
    nextPublishAt: schedule.nextPublishAt,
    nextPublishAtKst: schedule.nextPublishAtKst,
    scheduledGapHours: schedule.scheduledGapHours,
    gapLabel: schedule.gapLabel,
    slotOverdue: schedule.slotOverdue,
    publishCountToday: schedule.publishCountToday,
    maxPublishPerDay: MAX_PUBLISH_PER_DAY,
    lastPublishAt:
      typeof state.lastPublishAt === "string" ? state.lastPublishAt : null,
    stateSource,
  };
}

function kstDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getAdminPosts(): Promise<AdminPostRow[]> {
  return listPostsForAdmin();
}

export async function getAdminAnalytics() {
  return fetchGaSummary();
}

export function getAdminAutomationStatus() {
  return getAutomationStatus();
}

async function validateForPublish(slug: string): Promise<string[]> {
  const { integrityIssuesFlat, runPublishIntegrityGate } = await import(
    "../scripts/lib/publish-integrity.mjs"
  );
  const { state } = await loadAutomationState();
  const applyRepair = !usesRemotePostStore();
  const result = runPublishIntegrityGate(process.cwd(), slug, {
    phase: "publish",
    state,
    applyRepair,
  });
  return integrityIssuesFlat(result);
}

export async function publishPost(slug: string) {
  if (!slugExists(slug)) {
    throw new Error(`Post not found: ${slug}`);
  }

  const issues = await validateForPublish(slug);
  if (issues.length > 0) {
    throw new Error(issues.join("\n"));
  }

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const publishDate = kstDateString();
    const updatedAt = new Date().toISOString();
    await commitPostChanges(slug, `admin: publish ${slug}`, (_locale, data, content) => {
      const next: Record<string, unknown> = {
        ...data,
        draft: false,
        date: publishDate,
        updatedAt,
        publishedAt: updatedAt,
      };
      delete next.createdAt;
      return { data: next, content };
    });
    return { mode: "github" as const };
  }

  publishPostLocally(slug);
  return { mode: "local" as const };
}

export async function draftPost(slug: string) {
  if (!slugExists(slug)) {
    throw new Error(`Post not found: ${slug}`);
  }

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const updatedAt = new Date().toISOString();
    await commitPostChanges(slug, `admin: draft ${slug}`, (_locale, data, content) => ({
      data: {
        ...data,
        draft: true,
        updatedAt,
        createdAt: data.createdAt ?? updatedAt,
      },
      content,
    }));
    return { mode: "github" as const };
  }

  draftPostLocally(slug);
  return { mode: "local" as const };
}

export async function deletePost(slug: string) {
  if (!slugExists(slug)) {
    throw new Error(`Post not found: ${slug}`);
  }

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    await deletePostOnGithub(slug);
    return { mode: "github" as const };
  }

  deletePostLocally(slug);
  return { mode: "local" as const };
}

export function getPostPreview(slug: string, locale: "en" | "ko") {
  return readPostFile(slug, locale);
}
