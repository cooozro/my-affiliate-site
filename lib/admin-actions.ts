import "server-only";

import {
  commitPostChanges,
  deletePostOnGithub,
  fetchGaSummary,
} from "@/lib/admin-services";
import {
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

const TARGET_DRAFT_COUNT = 2;
const MAX_PUBLISH_PER_DAY = 2;

export type AutomationStatus = {
  mode: "publish-only";
  draftCount: number;
  targetDraftCount: number;
  needsReplenish: boolean;
  replenishNote: string;
  cursorDraftPending: boolean;
  cursorDraftTopic: string | null;
  nextPublishAt: string | null;
  nextPublishAtKst: string | null;
  scheduledGapHours: number | null;
  publishCountToday: number;
  maxPublishPerDay: number;
  lastPublishAt: string | null;
};

function formatKst(isoString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

export function getAutomationStatus(): AutomationStatus {
  const statePath = path.join(process.cwd(), "data", "automation", "state.json");
  const state = fs.existsSync(statePath)
    ? (JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, unknown>)
    : {};

  const draftCount = listPostsForAdmin().filter((post) => post.draft).length;
  const nextPublishAt =
    typeof state.nextPublishAt === "string" ? state.nextPublishAt : null;

  const requestPath = path.join(
    process.cwd(),
    "data",
    "automation",
    "cursor-draft-request.json",
  );
  let cursorDraftPending = false;
  let cursorDraftTopic: string | null = null;
  if (fs.existsSync(requestPath)) {
    try {
      const request = JSON.parse(fs.readFileSync(requestPath, "utf8")) as {
        status?: string;
        topic?: { id?: string };
      };
      cursorDraftPending = request.status === "pending";
      cursorDraftTopic =
        typeof request.topic?.id === "string" ? request.topic.id : null;
    } catch {
      cursorDraftPending = false;
    }
  }

  const replenishNote = cursorDraftPending
    ? `발행 후 Cursor(요미) 임시글 보충 대기 중${cursorDraftTopic ? ` — 주제: ${cursorDraftTopic}` : ""}.`
    : draftCount < TARGET_DRAFT_COUNT
      ? "임시글 버퍼가 부족합니다. Cursor에서 draft를 작성하거나, 다음 발행 시 자동으로 보충 요청이 생성됩니다."
      : "임시글 버퍼 충분. 발행 후 부족하면 Cursor 보충 요청이 자동 생성됩니다.";

  return {
    mode: "publish-only",
    draftCount,
    targetDraftCount: TARGET_DRAFT_COUNT,
    needsReplenish: draftCount < TARGET_DRAFT_COUNT || cursorDraftPending,
    replenishNote,
    cursorDraftPending,
    cursorDraftTopic,
    nextPublishAt,
    nextPublishAtKst: nextPublishAt ? formatKst(nextPublishAt) : null,
    scheduledGapHours:
      typeof state.scheduledGapHours === "number" ? state.scheduledGapHours : null,
    publishCountToday:
      typeof state.publishCountToday === "number" ? state.publishCountToday : 0,
    maxPublishPerDay: MAX_PUBLISH_PER_DAY,
    lastPublishAt:
      typeof state.lastPublishAt === "string" ? state.lastPublishAt : null,
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
  const { auditPostForPublish } = await import(
    "../scripts/lib/content-quality.mjs"
  );
  return auditPostForPublish(process.cwd(), slug);
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
    await deletePostOnGithub(slug);
    return { mode: "github" as const };
  }

  deletePostLocally(slug);
  return { mode: "local" as const };
}

export function getPostPreview(slug: string, locale: "en" | "ko") {
  return readPostFile(slug, locale);
}
