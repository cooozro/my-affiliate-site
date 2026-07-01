import "server-only";

import fs from "fs";
import os from "os";
import path from "path";
import {
  commitPostChanges,
  deleteGithubDirectory,
  readGithubFile,
  writeGithubBinaryFile,
} from "@/lib/admin-services";
import {
  assertGithubAdminConfigured,
  readPostFile,
  slugExists,
  usesRemotePostStore,
  writePostFile,
  type AdminPostRow,
} from "@/lib/posts-admin";

export type CoverStatus = "ok" | "missing" | "flagged" | "no-meta";

export type AdminPostCoverInfo = {
  coverImage?: string;
  coverStatus: CoverStatus;
  coverFlagReason?: string;
  coverImageProvider?: string;
  coverImageAssetId?: string | number;
};

const COVER_FRONTMATTER_KEYS = [
  "coverImage",
  "coverImageAlt",
  "coverImageAltKo",
  "coverImageCredit",
  "coverImageProvider",
  "coverImageAssetId",
  "coverImageSourceUrl",
  "imageSearchKeywords",
] as const;

type CoverFetchMeta = {
  coverImage: string;
  coverImageAlt: string;
  coverImageAltKo?: string;
  coverImageCredit?: string;
  coverImageProvider?: string;
  coverImageAssetId?: string | number;
  coverImageSourceUrl?: string;
  imageSearchKeywords?: string[];
};

function imageApisConfigured(): boolean {
  return Boolean(
    process.env.PEXELS_API_KEY?.trim() || process.env.PIXABAY_API_KEY?.trim(),
  );
}

async function loadBlockedAssetIds(): Promise<Set<string>> {
  const mod = await import("../scripts/lib/image-query.mjs");
  return mod.BLOCKED_ASSET_IDS;
}

export async function assessCoverFromData(
  slug: string,
  data: Record<string, unknown>,
): Promise<AdminPostCoverInfo> {
  const coverImage =
    typeof data.coverImage === "string" ? data.coverImage.trim() : "";
  const provider =
    typeof data.coverImageProvider === "string"
      ? data.coverImageProvider
      : undefined;
  const assetId = data.coverImageAssetId;

  if (!coverImage) {
    return { coverStatus: "no-meta" };
  }

  const blocked = await loadBlockedAssetIds();
  if (provider && assetId != null && assetId !== "") {
    const key = `${provider}:${assetId}`;
    if (blocked.has(key)) {
      return {
        coverImage,
        coverStatus: "flagged",
        coverFlagReason: `차단된 에셋 (${key})`,
        coverImageProvider: provider,
        coverImageAssetId: assetId as string | number,
      };
    }
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    coverImage.replace(/^\//, ""),
  );
  if (!fs.existsSync(filePath)) {
    return {
      coverImage,
      coverStatus: "missing",
      coverFlagReason: "배포 번들/CDN에 이미지 파일 없음",
      coverImageProvider: provider,
      coverImageAssetId: assetId as string | number | undefined,
    };
  }

  return {
    coverImage,
    coverStatus: "ok",
    coverImageProvider: provider,
    coverImageAssetId: assetId as string | number | undefined,
  };
}

export async function enrichPostsWithCover(
  posts: AdminPostRow[],
): Promise<Array<AdminPostRow & AdminPostCoverInfo>> {
  const enriched: Array<AdminPostRow & AdminPostCoverInfo> = [];

  for (const post of posts) {
    let data: Record<string, unknown> = {};
    if (slugExists(post.slug)) {
      try {
        data = readPostFile(post.slug, "en").data;
      } catch {
        /* ignore */
      }
    }
    const cover = await assessCoverFromData(post.slug, data);
    enriched.push({ ...post, ...cover });
  }

  return enriched;
}

function coverWorkRoot(slug: string): string {
  if (usesRemotePostStore()) {
    return path.join(os.tmpdir(), `aipick-cover-${slug}`);
  }
  return process.cwd();
}

function stripCoverFields(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  for (const key of COVER_FRONTMATTER_KEYS) {
    delete next[key];
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

function makeCoverMutate(
  meta: CoverFetchMeta,
  slug: string,
  buildCoverAlt: (
    locale: "en" | "ko",
    ctx: { title?: string; productKeywords: string[] },
  ) => string,
) {
  return (
    locale: "en" | "ko",
    data: Record<string, unknown>,
    content: string,
  ) => {
    const ctx = {
      title: String(data.title ?? slug),
      productKeywords: meta.imageSearchKeywords ?? [],
    };
    const coverImageAlt =
      locale === "ko" ? buildCoverAlt("ko", ctx) : meta.coverImageAlt;

    const next: Record<string, unknown> = {
      ...data,
      coverImage: meta.coverImage,
      coverImageAlt,
      coverImageCredit: meta.coverImageCredit,
      coverImageProvider: meta.coverImageProvider,
      coverImageAssetId: meta.coverImageAssetId,
      coverImageSourceUrl: meta.coverImageSourceUrl,
      ...(meta.imageSearchKeywords
        ? { imageSearchKeywords: meta.imageSearchKeywords }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    if (locale === "en" && meta.coverImageAltKo) {
      next.coverImageAltKo = meta.coverImageAltKo;
    }

    return { data: next, content };
  };
}

async function triggerVercelDeploy(): Promise<void> {
  const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
  if (!hook) return;
  try {
    await fetch(hook, { method: "POST" });
  } catch (error) {
    console.warn("Vercel deploy hook failed:", error);
  }
}

async function fetchNewCoverMeta(
  slug: string,
  enData: Record<string, unknown>,
): Promise<{ meta: CoverFetchMeta; rootDir: string }> {
  if (!imageApisConfigured()) {
    throw new Error(
      "PEXELS_API_KEY 또는 PIXABAY_API_KEY가 Vercel 환경변수에 필요합니다.",
    );
  }

  const { fetchCoverImage } = await import("../scripts/lib/cover-image.mjs");

  const rootDir = coverWorkRoot(slug);
  fs.mkdirSync(path.join(rootDir, "public", "images", "posts", slug), {
    recursive: true,
  });

  const imageInput = {
    title: enData.title,
    tags: enData.tags,
    imageSearchKeywords: enData.imageSearchKeywords,
    imageQuery: enData.imageQuery,
    topicCluster: enData.topicCluster,
    coverImage: enData.coverImage,
  };

  const meta = await fetchCoverImage(slug, imageInput, {
    forceRefresh: true,
    rootDir,
  });

  if (!meta?.coverImage) {
    throw new Error(
      "적합한 커버 이미지를 찾지 못했습니다. OPENAI_API_KEY(vision)와 검색 API 키를 확인하세요.",
    );
  }

  return { meta, rootDir };
}

async function commitCoverImageOnGithub(
  slug: string,
  meta: CoverFetchMeta,
  rootDir: string,
  mutate: ReturnType<typeof makeCoverMutate>,
) {
  assertGithubAdminConfigured();

  const imageRel = meta.coverImage.replace(/^\//, "");
  const imageAbs = path.join(rootDir, "public", imageRel);
  const imageBuffer = fs.readFileSync(imageAbs);

  let existingSha: string | undefined;
  try {
    const existing = await readGithubFile(imageRel);
    existingSha = existing.sha;
  } catch {
    existingSha = undefined;
  }

  await writeGithubBinaryFile(
    imageRel,
    imageBuffer,
    `admin: refresh cover ${slug}`,
    existingSha,
  );

  await commitPostChanges(slug, `admin: refresh cover ${slug}`, mutate);

  await triggerVercelDeploy();
}

export async function refreshPostCover(slug: string) {
  if (!slugExists(slug) && !usesRemotePostStore()) {
    throw new Error(`Post not found: ${slug}`);
  }

  let enData: Record<string, unknown>;

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const matter = await import("gray-matter");
    const enFile = await readGithubFile(`content/posts/${slug}/en.md`);
    enData = matter.default(enFile.content).data as Record<string, unknown>;
  } else {
    enData = readPostFile(slug, "en").data;
  }

  const { meta, rootDir } = await fetchNewCoverMeta(slug, enData);
  const { buildCoverAlt } = await import("../scripts/lib/image-query.mjs");
  const mutate = makeCoverMutate(meta, slug, buildCoverAlt);

  if (usesRemotePostStore()) {
    await commitCoverImageOnGithub(slug, meta, rootDir, mutate);
    return { mode: "github" as const, coverImage: meta.coverImage };
  }

  for (const locale of ["en", "ko"] as const) {
    const filePath = path.join(process.cwd(), "content", "posts", slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;
    const { data, content } = readPostFile(slug, locale);
    const next = mutate(locale, data, content);
    writePostFile(slug, locale, next.data, next.content);
  }

  return { mode: "local" as const, coverImage: meta.coverImage };
}

export async function removePostCover(slug: string) {
  if (!slugExists(slug) && !usesRemotePostStore()) {
    throw new Error(`Post not found: ${slug}`);
  }

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    await deleteGithubDirectory(
      `public/images/posts/${slug}`,
      `admin: remove cover ${slug}`,
    );
    await commitPostChanges(slug, `admin: remove cover ${slug}`, (_locale, data, content) => ({
      data: stripCoverFields(data),
      content,
    }));
    await triggerVercelDeploy();
    return { mode: "github" as const };
  }

  const imageDir = path.join(process.cwd(), "public", "images", "posts", slug);
  if (fs.existsSync(imageDir)) {
    fs.rmSync(imageDir, { recursive: true, force: true });
  }

  for (const locale of ["en", "ko"] as const) {
    const filePath = path.join(process.cwd(), "content", "posts", slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;
    const { data, content } = readPostFile(slug, locale);
    writePostFile(slug, locale, stripCoverFields(data), content);
  }

  return { mode: "local" as const };
}

export function coverApisReady(): boolean {
  return imageApisConfigured();
}
