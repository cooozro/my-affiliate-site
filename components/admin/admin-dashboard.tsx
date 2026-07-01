"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminPostRow = {
  slug: string;
  titleEn: string;
  titleKo: string;
  draft: boolean;
  date: string;
  updatedAt?: string;
  hasEn: boolean;
  hasKo: boolean;
  coverImage?: string;
  coverStatus: "ok" | "missing" | "flagged" | "no-meta";
  coverFlagReason?: string;
  coverImageProvider?: string;
  coverImageAssetId?: string | number;
};

type PostFilter = "all" | "cover-issues";

type GaSummary = {
  activeUsers7d: number;
  sessions7d: number;
  pageViews7d: number;
  activeUsers28d: number;
};

type AutomationStatus = {
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

export function AdminDashboard() {
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [analytics, setAnalytics] = useState<GaSummary | null>(null);
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mutations, setMutations] = useState<{
    mode: "github" | "local";
    githubConfigured: boolean;
  } | null>(null);
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [coverApisReady, setCoverApisReady] = useState(true);
  const [coverBusy, setCoverBusy] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/posts", { credentials: "same-origin" });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) detail = body.error;
      } catch {
        /* ignore */
      }
      setError(
        response.status === 401
          ? "세션이 만료되었습니다. /admin/login 에서 다시 로그인하세요."
          : `Failed to load admin data: ${detail}`,
      );
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      posts: AdminPostRow[];
      analytics: GaSummary | null;
      automation: AutomationStatus;
      coverApisReady?: boolean;
      mutations?: { mode: "github" | "local"; githubConfigured: boolean };
    };
    setPosts(data.posts);
    setAnalytics(data.analytics);
    setAutomation(data.automation);
    setCoverApisReady(data.coverApisReady ?? true);
    setMutations(data.mutations ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function runAction(slug: string, action: "publish" | "draft" | "delete") {
    setMessage("");
    setError("");

    if (action === "delete") {
      const confirmed = window.confirm(`Delete "${slug}" permanently?`);
      if (!confirmed) return;
    }

    const response = await fetch(`/api/admin/posts/${slug}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers:
        action === "delete" ? undefined : { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });

    const data = (await response.json()) as {
      error?: string;
      mode?: "local" | "github";
    };

    if (!response.ok) {
      setError(data.error ?? "Action failed");
      return;
    }

    const deployNote =
      data.mode === "github"
        ? " GitHub commit sent — Vercel redeploy may take 1–2 minutes."
        : "";
    setMessage(
      `${action === "publish" ? "Published" : action === "draft" ? "Moved to draft" : "Deleted"}: ${slug}.${deployNote}`,
    );
    await loadData();
  }

  async function runCoverAction(slug: string, action: "refresh-cover" | "remove-cover") {
    if (action === "remove-cover") {
      const confirmed = window.confirm(`"${slug}" 커버 이미지를 삭제할까요?`);
      if (!confirmed) return;
    }

    setCoverBusy(slug);
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/posts/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = (await response.json()) as {
      error?: string;
      mode?: "local" | "github";
      coverImage?: string;
    };

    setCoverBusy(null);

    if (!response.ok) {
      setError(data.error ?? "Cover action failed");
      return;
    }

    const deployNote =
      data.mode === "github"
        ? " GitHub commit 완료 — Vercel 재배포 후 1–2분 내 라이브 반영."
        : "";
    setMessage(
      action === "refresh-cover"
        ? `커버 교체: ${slug}${data.coverImage ? ` → ${data.coverImage}` : ""}.${deployNote}`
        : `커버 삭제: ${slug}.${deployNote}`,
    );
    await loadData();
  }

  const coverIssueCount = posts.filter((p) => p.coverStatus !== "ok").length;
  const visiblePosts =
    postFilter === "cover-issues"
      ? posts.filter((p) => p.coverStatus !== "ok")
      : posts;

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/";
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading admin...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic overview and post management for aipick.shop
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-muted"
        >
          Log out
        </button>
      </div>

      {mutations?.mode === "github" && !mutations.githubConfigured ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Vercel 배포에서는 글 발행·삭제가 GitHub API로 동작합니다.{" "}
          <strong>GITHUB_TOKEN</strong>을 Vercel 환경변수에 추가한 뒤 재배포하세요.
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Google Analytics</h2>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Open GA4 dashboard
          </a>
        </div>

        {analytics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Active users (7d)" value={analytics.activeUsers7d} />
            <MetricCard label="Sessions (7d)" value={analytics.sessions7d} />
            <MetricCard label="Page views (7d)" value={analytics.pageViews7d} />
            <MetricCard label="Active users (28d)" value={analytics.activeUsers28d} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Live GA summary needs{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">GA4_PROPERTY_ID</code>{" "}
            and Analytics Data API access for your service account. Tracking tag{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">G-EBRFDG46GW</code>{" "}
            is already installed on the public site.
          </p>
        )}
      </section>

      {automation ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">발행 스케줄 · 임시글 큐</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="임시글 (draft)"
              value={automation.draftLabel}
            />
            <MetricCard
              label="오늘 발행"
              value={`${automation.publishCountToday} / ${automation.maxPublishPerDay}`}
            />
            <MetricCard
              label="다음 발행 (KST)"
              value={automation.nextPublishAtKst ?? "미정"}
            />
            <MetricCard label="다음 간격" value={automation.gapLabel} />
          </div>
          {automation.slotOverdue ? (
            <p className="mt-3 text-sm text-amber-200">
              예정 시각이 지났습니다. GitHub Actions가 5분마다 catch-up 발행을
              시도합니다.
            </p>
          ) : null}
          {automation.stateSource === "bundle" && mutations?.mode === "github" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              스케줄 state는 배포 번들 기준입니다. GITHUB_TOKEN 설정 시 GitHub
              최신 state를 우선 표시합니다.
            </p>
          ) : null}
          {automation.needsReplenish ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
              {automation.replenishNote}
              {automation.cursorDraftPendingSince ? (
                <>
                  <br />
                  대기 시작:{" "}
                  {new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(automation.cursorDraftPendingSince))}
                </>
              ) : null}
              {automation.cursorDraftLastError ? (
                <>
                  <br />
                  <span className="text-amber-200">
                    최근 실패: {automation.cursorDraftLastError}
                  </span>
                </>
              ) : null}
              <br />
              {automation.cursorDraftPending
                ? "GitHub Actions가 pending 요청을 5분마다 재시도합니다 (Cursor API, PC 불필요)."
                : "발행 후 buffer가 부족하면 GitHub Actions가 Cursor로 자동 보충합니다."}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              임시글 버퍼가 충분합니다. 다음 자동 발행은 위 시각 이후 15분 단위
              체크에서 진행됩니다.
            </p>
          )}
        </section>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Posts</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPostFilter("all")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                postFilter === "all"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              전체 ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setPostFilter("cover-issues")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                postFilter === "cover-issues"
                  ? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                  : "border-border hover:bg-muted"
              }`}
            >
              커버 이슈 ({coverIssueCount})
            </button>
          </div>
        </div>

        {!coverApisReady ? (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            커버 자동 교체에는 Vercel에{" "}
            <strong>PEXELS_API_KEY</strong> 또는 <strong>PIXABAY_API_KEY</strong>
            (권장: <strong>OPENAI_API_KEY</strong> vision)가 필요합니다.
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Cover</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Title (EN)</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Locales</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visiblePosts.map((post) => (
                <tr key={post.slug} className="border-b border-border/60">
                  <td className="px-3 py-3 align-top">
                    <CoverCell post={post} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{post.slug}</td>
                  <td className="px-3 py-3">{post.titleEn}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        post.draft
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-green-500/15 text-green-700 dark:text-green-300"
                      }`}
                    >
                      {post.draft ? "Draft" : "Published"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {post.updatedAt?.slice(0, 10) ?? post.date}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {post.hasEn ? "EN" : "—"}
                    {post.hasKo ? " / KO" : ""}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/preview/${post.slug}?locale=en`}
                        target="_blank"
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Preview
                      </Link>
                      {!post.draft ? (
                        <a
                          href={`/en/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Live
                        </a>
                      ) : null}
                      {post.draft ? (
                        <button
                          type="button"
                          onClick={() => void runAction(post.slug, "publish")}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runAction(post.slug, "draft")}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Draft
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void runAction(post.slug, "delete")}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        disabled={coverBusy === post.slug || !coverApisReady}
                        onClick={() => void runCoverAction(post.slug, "refresh-cover")}
                        className="rounded border border-sky-500/40 px-2 py-1 text-xs text-sky-700 hover:bg-sky-500/10 disabled:opacity-40 dark:text-sky-300"
                      >
                        {coverBusy === post.slug ? "…" : "커버 교체"}
                      </button>
                      {post.coverImage ? (
                        <button
                          type="button"
                          disabled={coverBusy === post.slug}
                          onClick={() => void runCoverAction(post.slug, "remove-cover")}
                          className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-800 hover:bg-amber-500/10 disabled:opacity-40 dark:text-amber-200"
                        >
                          커버 삭제
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visiblePosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {postFilter === "cover-issues"
                      ? "커버 이슈가 있는 글이 없습니다."
                      : "글이 없습니다."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CoverCell({ post }: { post: AdminPostRow }) {
  const statusStyles: Record<AdminPostRow["coverStatus"], string> = {
    ok: "bg-green-500/15 text-green-700 dark:text-green-300",
    missing: "bg-red-500/15 text-red-700 dark:text-red-300",
    flagged: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    "no-meta": "bg-muted text-muted-foreground",
  };

  const statusLabel: Record<AdminPostRow["coverStatus"], string> = {
    ok: "OK",
    missing: "누락",
    flagged: "오류",
    "no-meta": "없음",
  };

  return (
    <div className="flex max-w-[140px] flex-col gap-2">
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          className="h-16 w-28 rounded border border-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
          No image
        </div>
      )}
      <span
        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[post.coverStatus]}`}
        title={post.coverFlagReason}
      >
        {statusLabel[post.coverStatus]}
      </span>
      {post.coverFlagReason ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          {post.coverFlagReason}
        </p>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}
