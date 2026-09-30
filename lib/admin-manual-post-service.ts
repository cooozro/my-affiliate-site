import "server-only";

import matter from "gray-matter";
import {
  assertGithubAdminConfigured,
  readPostFile,
  readPostFileAsync,
  slugExists,
  slugExistsAsync,
  usesRemotePostStore,
  writePostFile,
} from "@/lib/posts-admin";
import {
  writeGithubFile,
  readGithubFile,
  dispatchManualTranslateWorkflow,
} from "@/lib/admin-services";
import { translateManualPostKoToEn } from "@/lib/admin-translate";
import { notifySelahimAipickSync } from "@/lib/selahim-sync";

export type ManualPostPayload = {
  slug?: string;
  titleKo: string;
  descriptionKo?: string;
  bodyKo: string;
  tags?: string[];
  shareTop?: boolean;
  shareBottom?: boolean;
  coverImage?: string;
  coverImageAltKo?: string;
};

export type ManualPostView = {
  slug: string;
  titleKo: string;
  descriptionKo: string;
  bodyKo: string;
  tags: string[];
  shareTop: boolean;
  shareBottom: boolean;
  coverImage?: string;
  coverImageAltKo?: string;
  draft: boolean;
};


function firstBodyImageSrc(body: string): string | undefined {
  const m = body.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  const src = m?.[1]?.trim();
  if (!src) return undefined;
  // Prefer site-local post images for cover/list cards.
  if (src.startsWith("/images/posts/") || src.startsWith("/api/media/posts/")) {
    return src.replace("/api/media/posts/", "/images/posts/");
  }
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return undefined;
}

function slugify(input: string): string {
  // Strip Hangul first so leftover separators do not leave a trailing "-".
  return input
    .trim()
    .toLowerCase()
    .replace(/[가-힣]+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function kstDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function defaultTags(title: string): string[] {
  const words = title.split(/\s+/).filter((w) => w.length >= 2).slice(0, 3);
  while (words.length < 3) words.push("가이드");
  return words;
}

async function writeBothLocales(
  slug: string,
  ko: { data: Record<string, unknown>; content: string },
  en: { data: Record<string, unknown>; content: string },
): Promise<"local" | "github"> {
  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    for (const [locale, pack] of [
      ["ko", ko],
      ["en", en],
    ] as const) {
      const md = matter.stringify(pack.content, pack.data);
      await writeGithubFile(
        `content/posts/${slug}/${locale}.md`,
        md,
        `admin: manual save ${slug} (${locale})`,
      );
    }
    return "github";
  }

  writePostFile(slug, "ko", ko.data, ko.content);
  writePostFile(slug, "en", en.data, en.content);
  return "local";
}

export async function loadManualPost(slug: string): Promise<ManualPostView | null> {
  try {
    const { data, content } = await readPostFileAsync(slug, "ko");
    return {
      slug,
      titleKo: String(data.title ?? ""),
      descriptionKo: String(data.description ?? ""),
      bodyKo: content,
      tags: Array.isArray(data.tags)
        ? data.tags.map((t) => String(t)).filter(Boolean)
        : [],
      shareTop: data.shareTop !== false,
      shareBottom: data.shareBottom !== false,
      coverImage: data.coverImage ? String(data.coverImage) : undefined,
      coverImageAltKo: data.coverImageAltKo
        ? String(data.coverImageAltKo)
        : undefined,
      draft: Boolean(data.draft),
    };
  } catch {
    return null;
  }
}

export async function saveManualPostFromKo(
  payload: ManualPostPayload,
  existingSlug?: string,
): Promise<{
  slug: string;
  mode: "local" | "github";
  translated: boolean;
  translationQueued?: boolean;
  translateDetail?: string;
}> {
  const titleKo = payload.titleKo.trim();
  const bodyKo = payload.bodyKo.trim();
  if (!titleKo) throw new Error("제목을 입력하세요.");
  if (!bodyKo) throw new Error("본문을 입력하세요.");

  let slug = existingSlug?.trim() || payload.slug?.trim() || slugify(titleKo);
  if (!slug) slug = `manual-${Date.now()}`;
  if (!existingSlug) {
    let n = 2;
    const base = slug;
    while (slugExists(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
  } else if (!(await slugExistsAsync(slug))) {
    throw new Error(`글을 찾을 수 없습니다: ${slug}`);
  }

  const tagsKo = (payload.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const tags = tagsKo.length >= 3 ? tagsKo : defaultTags(titleKo);

  let translated = true;
  let translationQueued = false;
  let en: Awaited<ReturnType<typeof translateManualPostKoToEn>>;
  try {
    en = await translateManualPostKoToEn({
      titleKo,
      descriptionKo: payload.descriptionKo,
      bodyKo,
      tagsKo: tags,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const missingKey =
      /No free translate key set|GEMINI_API_KEY|GOOGLE_TRANSLATE_API_KEY|GOOGLE_SERVICE_ACCOUNT_JSON/i.test(
        detail,
      );
    if (!missingKey) {
      throw new Error(`영문 번역 실패: ${detail}`);
    }

    // Vercel may lack Gemini/Google Translate keys — queue GitHub Actions
    // which uses the free translate path (never DeepSeek for locale translate).
    translated = false;
    translationQueued = true;
    en = {
      titleEn: titleKo,
      descriptionEn: (payload.descriptionKo ?? titleKo).slice(0, 160),
      bodyEn: bodyKo,
      tagsEn: tags,
    };
  }

  const now = new Date().toISOString();
  const date = kstDateString();
  const prevKo = slugExists(slug) ? readPostFile(slug, "ko").data : {};
  const prevCover =
    typeof prevKo.coverImage === "string" ? String(prevKo.coverImage) : "";
  const coverFromBody = firstBodyImageSrc(bodyKo);
  const coverImage =
    (payload.coverImage && payload.coverImage.trim()) ||
    prevCover ||
    coverFromBody ||
    "";
  const coverAlt =
    (payload.coverImageAltKo && payload.coverImageAltKo.trim()) ||
    (typeof prevKo.coverImageAltKo === "string"
      ? String(prevKo.coverImageAltKo)
      : "") ||
    (typeof prevKo.coverImageAlt === "string"
      ? String(prevKo.coverImageAlt)
      : "") ||
    titleKo;

  const shared = {
    draft: prevKo.draft ?? true,
    date: prevKo.date ?? date,
    createdAt: prevKo.createdAt ?? now,
    updatedAt: now,
    manualOrigin: true,
    automationBuffer: false,
    writingProvider: "manual",
    contentProfile: "editorial",
    shareTop: payload.shareTop !== false,
    shareBottom: payload.shareBottom !== false,
    ...(coverImage
      ? {
          coverImage,
          coverImageAlt: coverAlt,
          coverImageAltKo: coverAlt,
          coverImageProvider:
            prevKo.coverImageProvider ??
            (coverFromBody && coverImage === coverFromBody
              ? "manual-body"
              : "admin-upload"),
        }
      : {}),
  };

  const koData = {
    ...shared,
    title: titleKo,
    description: payload.descriptionKo?.trim() || titleKo.slice(0, 160),
    tags,
  };

  const enData = {
    ...shared,
    title: en.titleEn,
    description: en.descriptionEn || en.titleEn.slice(0, 160),
    tags: en.tagsEn.length >= 3 ? en.tagsEn : tags,
  };

  if (translationQueued) {
    (enData as Record<string, unknown>).enTranslationPending = true;
  } else {
    delete (enData as Record<string, unknown>).enTranslationPending;
  }

  const mode = await writeBothLocales(
    slug,
    { data: koData, content: bodyKo },
    { data: enData, content: en.bodyEn },
  );

  let translateDetail: string | undefined;
  if (translationQueued) {
    const dispatched = await dispatchManualTranslateWorkflow(slug);
    translateDetail = dispatched.detail;
    if (!dispatched.ok) {
      throw new Error(
        `저장은 됐지만 스케줄러 번역 큐 호출 실패: ${dispatched.detail}`,
      );
    }
  }

  void notifySelahimAipickSync({ slug, refillBuffer: false });
  return {
    slug,
    mode,
    translated,
    translationQueued,
    translateDetail,
  };
}

export async function readManualPostMarkdown(
  slug: string,
  locale: "en" | "ko",
): Promise<string> {
  if (usesRemotePostStore()) {
    const { content } = await readGithubFile(`content/posts/${slug}/${locale}.md`);
    return content;
  }
  const filePath = `${process.cwd()}/content/posts/${slug}/${locale}.md`;
  const fs = await import("fs");
  return fs.readFileSync(filePath, "utf8");
}
