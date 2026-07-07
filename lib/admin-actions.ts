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
  operationsBrief: {
    reportSlug: string;
    reportUpdatedAt: string | null;
    publishedPostCount: number;
    formatMix: Array<{ profile: string; count: number; ratio: number }>;
    uniqueTopicCount: number;
    scheduler: {
      maxPublishPerDay: number;
      targetDraftCount: number;
      nextPublishAtKst: string | null;
      scheduledGapHours: number | null;
    };
    exposureChannels: string[];
    topicSelectionMethod: string[];
    keywordMethod: string[];
  };
};

async function readEnFrontmatter(
  slug: string,
): Promise<Record<string, unknown> | null> {
  const relativePath = `content/posts/${slug}/en.md`;
  try {
    if (usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim()) {
      const { content } = await readGithubFile(relativePath);
      const matter = await import("gray-matter");
      return matter.default(content).data as Record<string, unknown>;
    }
    const filePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const matter = await import("gray-matter");
    return matter.default(raw).data as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function buildOperationsBrief(
  posts: AdminPostRow[],
  schedule: ReturnType<typeof previewPublishSchedule>,
  state: Record<string, unknown>,
) {
  const published = posts.filter(
    (post) => !post.draft && !isAdminPublishBlocked(post.slug),
  );

  const formatCounts = new Map<string, number>();
  for (const post of published) {
    const data = await readEnFrontmatter(post.slug);
    const profile =
      typeof data?.contentProfile === "string" ? data.contentProfile : "unknown";
    formatCounts.set(profile, (formatCounts.get(profile) ?? 0) + 1);
  }

  const total = published.length || 1;
  const formatMix = [...formatCounts.entries()]
    .map(([profile, count]) => ({
      profile,
      count,
      ratio: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const uniqueTopicCount = new Set(
    (Array.isArray(state.usedTopicIds) ? state.usedTopicIds : []).filter(
      (v): v is string => typeof v === "string",
    ),
  ).size;

  const reportUpdatedAt = posts.find(
    (p) => p.slug === "aipick-seo-precision-report",
  )?.updatedAt;

  return {
    reportSlug: "aipick-seo-precision-report",
    reportUpdatedAt: reportUpdatedAt ?? null,
    publishedPostCount: published.length,
    formatMix,
    uniqueTopicCount,
    scheduler: {
      maxPublishPerDay: MAX_PUBLISH_PER_DAY,
      targetDraftCount: TARGET_DRAFT_COUNT,
      nextPublishAtKst: schedule.nextPublishAtKst,
      scheduledGapHours: schedule.scheduledGapHours,
    },
    exposureChannels: [
      "Google Indexing API (EN/KO URL_UPDATED)",
      "IndexNow: global + Naver + Bing",
      "Sitemap/RSS warm fetch after publish",
      "GHA on-push index submission (admin publish 포함)",
    ],
    topicSelectionMethod: [
      "roadmap phase 기반 우선순위 (tier1 → tier2 → format rotation)",
      "동일 topic/category/cluster 3연속 방지",
      "taxonomy group spread로 미커버 제품군 우선",
    ],
    keywordMethod: [
      "contentProfile 템플릿 기반 섹션/의도 정합성",
      "SERP 구조 점수 + Guardian 무결성 게이트",
      "과도한 키워드 반복보다 문제 해결형 문맥 우선",
    ],
  };
}

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

  const cursorDraftPendingSinceMs =
    cursorDraftPendingSince != null
      ? Date.now() - new Date(cursorDraftPendingSince).getTime()
      : null;
  const cursorDraftPendingMinutes =
    cursorDraftPendingSinceMs != null
      ? Math.floor(cursorDraftPendingSinceMs / 60_000)
      : null;

  const draftLabel =
    cursorDraftPending && cursorDraftNeeded > 0
      ? cursorDraftLastError
        ? `${draftCount} / ${TARGET_DRAFT_COUNT} (+${cursorDraftNeeded} 보충 재시도 중)`
        : cursorDraftPendingMinutes != null && cursorDraftPendingMinutes >= 20
          ? `${draftCount} / ${TARGET_DRAFT_COUNT} (+${cursorDraftNeeded} 보충 대기 ${cursorDraftPendingMinutes}분)`
          : `${draftCount} / ${TARGET_DRAFT_COUNT} (+${cursorDraftNeeded} 작성 중)`
      : `${draftCount} / ${TARGET_DRAFT_COUNT}`;

  const replenishNote = cursorDraftPending
    ? cursorDraftLastError
      ? `Cursor API 보충이 실패해 GitHub Actions가 5분마다 재시도 중입니다${cursorDraftTopic ? ` (주제: ${cursorDraftTopic})` : ""}. OpenAI 키는 필요 없습니다 — 아래 실패 메시지를 확인하세요.`
      : cursorDraftPendingMinutes != null && cursorDraftPendingMinutes >= 20
        ? `임시글 보충 요청이 ${cursorDraftPendingMinutes}분째 대기 중입니다${cursorDraftTopic ? ` (주제: ${cursorDraftTopic})` : ""}. Cursor API 한도·GHA 스케줄 지연일 수 있습니다.`
        : `GitHub Actions가 Cursor API로 임시글 보충 중${cursorDraftTopic ? ` (주제: ${cursorDraftTopic})` : ""}. 보통 5–20분 (한도에 따라 더 걸릴 수 있음).`
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
  const operationsBrief = await buildOperationsBrief(posts, schedule, state);

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
    operationsBrief,
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
