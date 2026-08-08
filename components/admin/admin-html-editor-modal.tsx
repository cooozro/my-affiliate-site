"use client";

import { useEffect, useState } from "react";

type AdminHtmlEditorModalProps = {
  slug: string;
  locale: "en" | "ko";
  title: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AdminHtmlEditorModal({
  slug,
  locale,
  title,
  open,
  onClose,
  onSaved,
  onError,
}: AdminHtmlEditorModalProps) {
  const [tab, setTab] = useState<"html" | "markdown">("html");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setCopyState("idle");

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/posts/${slug}/content?locale=${locale}`,
          { credentials: "same-origin" },
        );
        const data = (await response.json()) as {
          html?: string;
          markdown?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "불러오기 실패");
        }
        if (cancelled) return;
        setHtml(data.html ?? "");
        setMarkdown(data.markdown ?? "");
        setTab("html");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "불러오기 실패";
        onError?.(message);
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, slug, locale, onClose, onError]);

  if (!open) return null;

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html);
      setCopyState("done");
      onSaved?.(`HTML 전체가 클립보드에 복사되었습니다. (${slug})`);
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      onError?.("클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/posts/${slug}/content`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tab === "html"
            ? { locale, mode: "html", html }
            : { locale, mode: "markdown", markdown },
        ),
      });
      const data = (await response.json()) as {
        error?: string;
        mode?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "저장 실패");
      }
      const deployNote =
        data.mode === "github"
          ? " GitHub에 커밋됨 — Vercel 재배포에 1–2분 걸릴 수 있습니다."
          : "";
      onSaved?.(`저장 완료: ${slug}.${deployNote}`);
      onClose();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="HTML 수정"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">HTML 수정</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {title} · <span className="font-mono">{slug}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            닫기
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setTab("html")}
            className={`rounded px-3 py-1.5 text-xs ${
              tab === "html"
                ? "bg-violet-500/20 font-medium text-violet-800 dark:text-violet-200"
                : "hover:bg-muted"
            }`}
          >
            HTML 코드
          </button>
          <button
            type="button"
            onClick={() => setTab("markdown")}
            className={`rounded px-3 py-1.5 text-xs ${
              tab === "markdown"
                ? "bg-violet-500/20 font-medium text-violet-800 dark:text-violet-200"
                : "hover:bg-muted"
            }`}
          >
            Markdown 소스
          </button>
          <button
            type="button"
            disabled={loading || !html}
            onClick={() => void copyHtml()}
            className="ml-auto rounded border border-violet-500/40 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-500/10 disabled:opacity-40 dark:text-violet-300"
          >
            {copyState === "done" ? "HTML 복사됨" : "HTML 전체복사"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <textarea
              value={tab === "html" ? html : markdown}
              onChange={(event) =>
                tab === "html"
                  ? setHtml(event.target.value)
                  : setMarkdown(event.target.value)
              }
              spellCheck={false}
              className="h-[min(60vh,520px)] w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            HTML 탭 저장 시 본문이 HTML 코드로 저장됩니다. Markdown 탭은
            frontmatter 포함 원본을 저장합니다. 발행 글도 동일하게 편집·복사할 수
            있습니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              취소
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => void save()}
              className="rounded border border-violet-500/50 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-500/25 disabled:opacity-40 dark:text-violet-200"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
