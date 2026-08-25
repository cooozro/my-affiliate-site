"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
  onError: (message: string) => void;
};

export function AdminManualPostModal({
  open,
  onClose,
  onCreated,
  onError,
}: Props) {
  const [slug, setSlug] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyKo, setBodyKo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!titleEn.trim()) {
      onError("영문 제목은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() || undefined,
          titleEn: titleEn.trim(),
          titleKo: titleKo.trim() || undefined,
          bodyEn: bodyEn.trim() || undefined,
          bodyKo: bodyKo.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      onCreated(data.slug ?? slug);
      setSlug("");
      setTitleEn("");
      setTitleKo("");
      setBodyEn("");
      setBodyKo("");
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl">
        <h3 className="text-lg font-semibold">수동 글쓰기</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          스케줄러 버퍼·자동 발행 카운트에 포함되지 않습니다 (manualOrigin).
          저장 후 Posts에서 수정·커버·발행하세요.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">Slug (선택)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
              placeholder="my-manual-post-slug"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Title EN *</span>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Title KO</span>
            <input
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Body EN (HTML/Markdown)</span>
            <textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Body KO</span>
            <textarea
              value={bodyKo}
              onChange={(e) => setBodyKo(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-xs"
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
          >
            {saving ? "저장 중…" : "저장 (임시글)"}
          </button>
        </div>
      </div>
    </div>
  );
}
