"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHARE_PLATFORMS } from "@/lib/share";

type Props = {
  initialSlug?: string;
};

type ImageRow = { filename: string; webPath: string };

export function AdminManualWriteEditor({ initialSlug }: Props) {
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [titleKo, setTitleKo] = useState("");
  const [descriptionKo, setDescriptionKo] = useState("");
  const [bodyKo, setBodyKo] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [shareTop, setShareTop] = useState(true);
  const [shareBottom, setShareBottom] = useState(true);
  const [coverImage, setCoverImage] = useState("");
  const [coverAltKo, setCoverAltKo] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(Boolean(initialSlug));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async (s: string) => {
    if (!s) return;
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(s)}/images`, {
      credentials: "same-origin",
    });
    const data = await res.json();
    if (res.ok) setImages(data.images ?? []);
  }, []);

  useEffect(() => {
    if (!initialSlug) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/manual-post/${encodeURIComponent(initialSlug)}`,
          { credentials: "same-origin" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
        setSlug(data.slug);
        setTitleKo(data.titleKo ?? "");
        setDescriptionKo(data.descriptionKo ?? "");
        setBodyKo(data.bodyKo ?? "");
        setTagsText((data.tags ?? []).join(", "));
        setShareTop(data.shareTop !== false);
        setShareBottom(data.shareBottom !== false);
        setCoverImage(data.coverImage ?? "");
        setCoverAltKo(data.coverImageAltKo ?? "");
        await loadImages(data.slug);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [initialSlug, loadImages]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const tags = tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const url = slug
        ? `/api/admin/manual-post/${encodeURIComponent(slug)}`
        : "/api/admin/manual-post";
      const res = await fetch(url, {
        method: slug ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleKo,
          descriptionKo,
          bodyKo,
          tags,
          shareTop,
          shareBottom,
          coverImage: coverImage || undefined,
          coverImageAltKo: coverAltKo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      if (!slug && data.slug) {
        setSlug(data.slug);
        window.history.replaceState(null, "", `/admin/write/${data.slug}`);
      }
      setMessage(
        data.translated
          ? "저장 완료 — 영문(en.md) 자동 번역 반영됨"
          : "저장 완료 (번역 API 없음 — KO와 동일 본문으로 EN 저장)",
      );
      await loadImages(data.slug ?? slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!slug) {
      setError("먼저 저장하세요.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "발행 실패");
      setMessage("발행되었습니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function deletePost() {
    if (!slug || !window.confirm("이 글을 삭제할까요?")) return;
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "삭제 실패");
      return;
    }
    window.close();
  }

  async function uploadCover(file: File) {
    if (!slug) {
      setError("저장 후 커버를 업로드하세요.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "cover");
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}/images`, {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "커버 업로드 실패");
    setCoverImage(data.coverImage ?? data.webPath ?? "");
    setMessage("커버 이미지 저장됨");
    await loadImages(slug);
  }

  async function uploadBodyImage(file: File) {
    if (!slug) {
      setError("저장 후 본문 이미지를 업로드하세요.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "body");
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}/images`, {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "이미지 업로드 실패");
    const insert = `\n\n<img src="${data.webPath}" alt="${titleKo.slice(0, 80)}" loading="lazy" style="max-width:100%;height:auto;" />\n`;
    setBodyKo((prev) => `${prev}${insert}`);
    setMessage(`본문에 이미지 삽입: ${data.webPath}`);
    await loadImages(slug);
  }

  async function removeImage(filename: string) {
    if (!slug) return;
    const res = await fetch(
      `/api/admin/posts/${encodeURIComponent(slug)}/images?file=${encodeURIComponent(filename)}`,
      { method: "DELETE", credentials: "same-origin" },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "삭제 실패");
    await loadImages(slug);
    setMessage(`이미지 삭제: ${filename}`);
  }

  function insertImageTag(webPath: string) {
    const tag = `<img src="${webPath}" alt="${titleKo.slice(0, 60)}" loading="lazy" style="max-width:100%;height:auto;" />`;
    setBodyKo((prev) => `${prev}\n\n${tag}\n`);
  }

  if (loading) {
    return <p className="p-8 text-center text-muted-foreground">불러오는 중…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold">수동 글쓰기</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            한국어만 작성 · 저장 시 영문(en.md) 자동 번역 · 스케줄러 카운트 제외
          </p>
          {slug ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{slug}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing || !slug}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            {publishing ? "발행 중…" : "발행"}
          </button>
          {slug ? (
            <a
              href={`/admin/preview/${slug}?locale=ko`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              미리보기
            </a>
          ) : null}
          {slug ? (
            <button
              type="button"
              onClick={() => void deletePost()}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600"
            >
              삭제
            </button>
          ) : null}
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 whitespace-pre-wrap">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">제목 (KO) *</span>
          <input
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">요약 (KO)</span>
          <input
            value={descriptionKo}
            onChange={(e) => setDescriptionKo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            태그 (쉼표 구분, 3개 이상 권장)
          </span>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="블루투스 스피커, 캠핑, 리뷰"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">공유 버튼 (기본 ON)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          발행 글 상·하단에 표시:{" "}
          {SHARE_PLATFORMS.map((p) => p.label).join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shareTop}
              onChange={(e) => setShareTop(e.target.checked)}
            />
            상단 공유
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shareBottom}
              onChange={(e) => setShareBottom(e.target.checked)}
            />
            하단 공유
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">이미지</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="rounded border border-border px-3 py-1.5 text-xs"
          >
            커버 첨부/교체
          </button>
          <button
            type="button"
            onClick={() => bodyImageInputRef.current?.click()}
            className="rounded border border-border px-3 py-1.5 text-xs"
          >
            본문 이미지 첨부
          </button>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadCover(f).catch((err) => setError((err as Error).message));
            e.target.value = "";
          }}
        />
        <input
          ref={bodyImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadBodyImage(f).catch((err) => setError((err as Error).message));
            e.target.value = "";
          }}
        />
        <label className="mt-3 block text-xs">
          커버 ALT (KO)
          <input
            value={coverAltKo}
            onChange={(e) => setCoverAltKo(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
          />
        </label>
        {coverImage ? (
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{coverImage}</p>
        ) : null}
        {images.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {images.map((img) => (
              <li
                key={img.filename}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
              >
                <span className="font-mono">{img.filename}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-accent underline"
                    onClick={() => insertImageTag(img.webPath)}
                  >
                    본문 삽입
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() =>
                      void removeImage(img.filename).catch((err) =>
                        setError((err as Error).message),
                      )
                    }
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">첨부된 이미지 없음</p>
        )}
      </section>

      <label className="block text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          본문 (KO) — HTML/Markdown
        </span>
        <textarea
          value={bodyKo}
          onChange={(e) => setBodyKo(e.target.value)}
          rows={22}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed"
        />
      </label>
    </div>
  );
}
