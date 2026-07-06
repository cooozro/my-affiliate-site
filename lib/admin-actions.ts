import "server-only";

import {
  coverApisReady,
  enrichPostsWithCover,
  refreshPostCover,
  removePostCover,
  uploadPostCover,
} from "@/lib/cover-admin";
import {
  commitPostChanges,
  deletePostOnGithub,
  fetchGaSummary,
  readGithubFile,
  tryReadGithubJson,
} from "@/lib/admin-services";
import {
  assertGithubAdminConfigured,
  deletePostLocally,
  draftPostLocally,
  listPostsForAdminLive,
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
import {
  ADMIN_DRAFT_EXCLUDE,
  isAdminPublishBlocked,
} from "@/lib/admin-only-posts";

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
  healthIssues: Array<{ code: string; message: string; severity: string }>;
  manualReviewQueue: Array<{
    order: number;
    slug: string;
    issues: string[];
    urls: { en: string; ko: string; admin: string };
  }>;
  lastDailyContentAuditKst: string | null;
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
    (post) => post.draft && !ADMIN_DRAFT_EXCLUDE.has(post.slug),
  ).length;
}

async function loadDailyContentAudit(): Promise<Record<string, unknown> | null> {
  const localPath = path.join(
    process.cwd(),
    "data",
    "automation",
    "daily-content-audit.json",
  );

  if (usesRemotePostStore()) {
    const remote = await tryReadGithubJson(
      "data/automation/daily-content-audit.json",
    );
    if (remote) return remote;
  }

  return readLocalJson(localPath);
}

export async function getAutomationStatus(): Promise<AutomationStatus> {
  const { state, source: stateSource } = await loadAutomationState();
  const schedule = previewPublishSchedule(state);

  const posts = await listPostsForAdminLive();
  const draftCount = countAutomationDrafts(posts);

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
      ? "임시글 1건 부족. publish-slot(약 5분마다)에서 Cursor 작성 요청이 자동 등록됩니다."
      : "임시글 버퍼 충분. 발행·보충 모두 GitHub Actions에서 PC 없이 실행됩니다.";

  const lastHealthCheck = state.lastHealthCheck as
    | {
        issues?: Array<{ code: string; message: string; severity?: string }>;
      }
    | undefined;
  const healthIssues = (lastHealthCheck?.issues ?? [])
    .filter(
      (issue) => issue.severity === "error" || issue.severity === "warning",
    )
    .map((issue) => ({
      code: issue.code,
      message: issue.message,
      severity: issue.severity ?? "info",
    }));

  const dailyAudit = await loadDailyContentAudit();
  const manualReviewRaw = dailyAudit?.manualReview;
  const manualReviewQueue = Array.isArray(manualReviewRaw)
    ? (manualReviewRaw as Array<{
        order?: number;
        slug: string;
        issues?: string[];
        urls?: { en?: string; ko?: string; admin?: string };
      }>).map((item, index) => ({
        order: item.order ?? index + 1,
        slug: item.slug,
        issues: Array.isArray(item.issues) ? item.issues : [],
        urls: {
          en: item.urls?.en ?? "",
          ko: item.urls?.ko ?? "",
          admin: item.urls?.admin ?? "https://www.aipick.shop/admin",
        },
      }))
    : [];

  const lastDailyContentAuditKst =
    typeof state.lastDailyContentAuditKst === "string"
      ? state.lastDailyContentAuditKst
      : typeof dailyAudit?.dateKst === "string"
        ? dailyAudit.dateKst
        : null;

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
    healthIssues,
    manualReviewQueue,
    lastDailyContentAuditKst,
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

export async function getAdminPosts() {
  const posts = await listPostsForAdminLive();
  return enrichPostsWithCover(posts);
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
  if (isAdminPublishBlocked(slug)) {
    throw new Error(
      "aipick-seo-precision-report는 어드민 전용 SEO 리포트입니다. 발행할 수 없습니다. Preview로만 확인하세요.",
    );
  }

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
  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    await deletePostOnGithub(slug);
    return { mode: "github" as const };
  }

  if (!slugExists(slug)) {
    throw new Error(`Post not found: ${slug}`);
  }

  deletePostLocally(slug);
  return { mode: "local" as const };
}

export function getPostPreview(slug: string, locale: "en" | "ko") {
  return readPostFile(slug, locale);
}

/** Raw markdown file (frontmatter + body) for admin clipboard copy. */
export async function getPostCopyMarkdown(
  slug: string,
  locale: "en" | "ko",
): Promise<string> {
  if (!isAdminPublishBlocked(slug)) {
    throw new Error("Copy is only available for admin-only reports.");
  }

  const relativePath = `content/posts/${slug}/${locale}.md`;

  if (usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim()) {
    const { content } = await readGithubFile(relativePath);
    return content;
  }

  const filePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${slug}/${locale}.md`);
  }
  return fs.readFileSync(filePath, "utf8");
}

export async function uploadCoverImage(
  slug: string,
  file: { buffer: Buffer; mimeType: string; originalName?: string },
) {
  return uploadPostCover(slug, file);
}

export async function refreshCoverImage(slug: string) {
  return refreshPostCover(slug);
}

export async function removeCoverImage(slug: string) {
  return removePostCover(slug);
}

export { coverApisReady };
