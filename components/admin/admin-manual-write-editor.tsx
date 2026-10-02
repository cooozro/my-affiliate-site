"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodySelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

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

  async function save(bodyOverride?: string, coverOverride?: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const tags = tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      // coverOverride === undefined → keep React state; "" clears / falls back server-side
      const nextCover =
        coverOverride !== undefined ? coverOverride : coverImage;
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
          bodyKo: bodyOverride ?? bodyKo,
          tags,
          shareTop,
          shareBottom,
          coverImage: nextCover,
          coverImageAltKo: coverAltKo || titleKo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      if (!slug && data.slug) {
        setSlug(data.slug);
        window.history.replaceState(null, "", `/admin/write/${data.slug}`);
      }
      if (typeof nextCover === "string") setCoverImage(nextCover);
      setMessage(
        data.translated
          ? "저장 완료 — 영문(en.md) 자동 번역 반영됨"
          : data.translationQueued
            ? "저장 완료 — 영문은 GitHub Actions(Gemini Free→Google Translate)로 번역 예약됨. 1~2분 후 EN 확인"
            : "저장 완료",
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


  function rememberBodySelection() {
    const el = bodyTextareaRef.current;
    if (!el) return;
    // Read selection while textarea still owns it (blur/mousedown handlers rely on this).
    bodySelectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    };
  }

  function preserveSelectionOnToolbarMouseDown(
    event: ReactMouseEvent<HTMLElement>,
  ) {
    // Keep textarea selection when clicking toolbar/file buttons.
    rememberBodySelection();
    event.preventDefault();
  }

  function insertAtCursor(snippet: string, baseValue?: string) {
    const value = baseValue ?? bodyKo;
    const sel = bodySelectionRef.current;
    const at = Math.max(0, Math.min(sel.start ?? value.length, value.length));
    const atEnd = Math.max(at, Math.min(sel.end ?? at, value.length));
    const next = `${value.slice(0, at)}${snippet}${value.slice(atEnd)}`;
    setBodyKo(next);
    const caret = at + snippet.length;
    bodySelectionRef.current = { start: caret, end: caret };
    requestAnimationFrame(() => {
      const box = bodyTextareaRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(caret, caret);
      rememberBodySelection();
    });
    return next;
  }

  async function uploadImage(file: File) {
    if (!slug) {
      setError("먼저 제목·본문을 저장한 뒤 이미지를 첨부하세요.");
      return;
    }
    rememberBodySelection();
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
    await loadImages(slug);
    setMessage(
      `이미지 첨부됨: ${data.webPath} — 아래에서 「본문에 넣기」/「커버」를 선택하세요.`,
    );
  }

  async function removeImage(filename: string) {
    if (!slug) return;
    const res = await fetch(
      `/api/admin/posts/${encodeURIComponent(slug)}/images?file=${encodeURIComponent(filename)}`,
      { method: "DELETE", credentials: "same-origin" },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "삭제 실패");
    // Drop from body if present; clear cover if it pointed at this file.
    const nextBody = bodyKo.replace(
      new RegExp(
        `<img\\b[^>]*\\bsrc=["'][^"']*${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["'][^>]*>`,
        "gi",
      ),
      "",
    );
    const coverCleared = coverImage.includes(filename) ? "" : coverImage;
    if (coverCleared !== coverImage) setCoverImage("");
    if (nextBody !== bodyKo) setBodyKo(nextBody);
    await loadImages(slug);
    await save(nextBody, coverCleared || undefined);
    setMessage(`이미지 삭제: ${filename}`);
  }

  function insertImageTag(webPath: string) {
    rememberBodySelection();
    // Avoid stacking the same src if the caret region already has it nearby —
    // still allow intentional re-insert; warn when already in body.
    if (bodyKo.includes(`src="${webPath}"`) || bodyKo.includes(`src='${webPath}'`)) {
      setMessage(`이미 본문에 있습니다: ${webPath} (커서 위치에 한 번 더 넣으려면 다시 누르세요)`);
    }
    const alt = (coverAltKo || titleKo || "image").slice(0, 80).replace(/"/g, "&quot;");
    const tag = `\n\n<img src="${webPath}" alt="${alt}" loading="lazy" style="max-width:100%;height:auto;border-radius:10px;" />\n`;
    const nextBody = insertAtCursor(tag);
    setMessage(`본문에 삽입: ${webPath}`);
    void save(nextBody);
  }

  async function setAsCover(webPath: string) {
    setCoverImage(webPath);
    if (!coverAltKo) setCoverAltKo(titleKo.slice(0, 120));
    setMessage(`커버(홈·OG 섬네일)로 지정: ${webPath}`);
    await save(undefined, webPath);
  }

  async function clearCover() {
    setCoverImage("");
    setMessage("커버 지정 해제 — 저장 시 본문 첫 이미지가 있으면 섬네일로만 씁니다(상단 히어로 중복 없음).");
    // Persist empty cover by sending explicit empty via override sentinel
    await save(undefined, "");
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
            한국어 HTML/Markdown 작성 · 저장 시 영문 자동 번역(Gemini Free→Google Translate) · 스케줄러 카운트 제외 · 투명성 고지 없음
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
              href={`/admin/preview/${encodeURIComponent(slug)}?locale=ko`}
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
        <p className="mt-1 text-xs text-muted-foreground">
          「이미지 첨부」로 파일을 올린 뒤, 각 항목에서{" "}
          <strong>본문에 넣기</strong>(커서 위치)와 <strong>커버</strong> 체크를
          고르세요. 커버는 홈·목록·OG 섬네일용이며, 본문에 같은 파일이 있으면 글
          상단 히어로는 중복으로 넣지 않습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => imageInputRef.current?.click()}
            disabled={!slug}
            className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            이미지 첨부
          </button>
          {coverImage ? (
            <button
              type="button"
              onClick={() => void clearCover().catch((err) => setError((err as Error).message))}
              className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
            >
              커버 지정 해제
            </button>
          ) : null}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f).catch((err) => setError((err as Error).message));
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
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            현재 커버: {coverImage}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">커버 미지정</p>
        )}
        {images.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {images.map((img) => {
              const isCover =
                coverImage === img.webPath ||
                coverImage.endsWith(`/${img.filename}`);
              const inBody =
                bodyKo.includes(`src="${img.webPath}"`) ||
                bodyKo.includes(`src='${img.webPath}'`) ||
                bodyKo.includes(img.filename);
              return (
                <li
                  key={img.filename}
                  className="flex flex-wrap items-center gap-3 rounded border border-border/60 px-2 py-2 text-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/posts/${slug}/${img.filename}`}
                    alt=""
                    className="h-14 w-20 rounded object-cover bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono">{img.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inBody ? "본문 사용 중" : "본문 미삽입"}
                      {isCover ? " · 커버" : ""}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <input
                      type="radio"
                      name="manual-cover"
                      checked={isCover}
                      onChange={() =>
                        void setAsCover(img.webPath).catch((err) =>
                          setError((err as Error).message),
                        )
                      }
                    />
                    커버
                  </label>
                  <button
                    type="button"
                    className="text-accent underline"
                    onMouseDown={preserveSelectionOnToolbarMouseDown}
                    onClick={() => insertImageTag(img.webPath)}
                  >
                    본문에 넣기
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
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">첨부된 이미지 없음</p>
        )}
      </section>

      <label className="block text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          본문 (KO) — HTML 붙여넣기 / Markdown 모두 가능
        </span>
        <textarea
          ref={bodyTextareaRef}
          value={bodyKo}
          onChange={(e) => setBodyKo(e.target.value)}
          onSelect={rememberBodySelection}
          onClick={rememberBodySelection}
          onKeyUp={rememberBodySelection}
          onMouseUp={rememberBodySelection}
          onBlur={rememberBodySelection}
          rows={22}
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed"
          placeholder="HTML 또는 Markdown을 붙여넣으세요. <article>, <p>, <img> 등 HTML 태그 그대로 렌더됩니다."
        />
      </label>
    </div>
  );
}
