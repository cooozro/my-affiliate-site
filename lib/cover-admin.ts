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

export type CoverStatus = "ok" | "missing" | "flagged" | "no-meta" | "github-only";

export type AdminPostCoverInfo = {
  coverImage?: string;
  coverFilename?: string;
  coverImageAlt?: string;
  coverImageAltKo?: string;
  coverPreviewUrl?: string;
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

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function coverFilenameFromPath(coverImage?: string): string | undefined {
  if (!coverImage) return undefined;
  const parts = coverImage.split("/");
  return parts[parts.length - 1] || undefined;
}

function extForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function githubRepoRef(): { repo: string; branch: string } {
  return {
    repo: process.env.GITHUB_REPO?.trim() ?? "cooozro/my-affiliate-site",
    branch: process.env.GITHUB_BRANCH?.trim() ?? "main",
  };
}

/** Live image on GitHub main — use in admin when Vercel bundle is stale. */
export function githubCoverPreviewUrl(coverImage: string, version = 0): string | undefined {
  if (!coverImage?.startsWith("/")) return undefined;
  const { repo, branch } = githubRepoRef();
  const base = `https://raw.githubusercontent.com/${repo}/${branch}/${coverImage.replace(/^\//, "")}`;
  return version > 0 ? `${base}?v=${version}` : base;
}

async function readEnDataForAdmin(slug: string): Promise<Record<string, unknown>> {
  if (usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim()) {
    try {
      const matter = await import("gray-matter");
      const { content } = await readGithubFile(`content/posts/${slug}/en.md`);
      return matter.default(content).data as Record<string, unknown>;
    } catch {
      /* fall through to bundle */
    }
  }
  if (slugExists(slug)) {
    return readPostFile(slug, "en").data;
  }
  return {};
}

async function readEnPostData(slug: string): Promise<Record<string, unknown>> {
  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const matter = await import("gray-matter");
    const enFile = await readGithubFile(`content/posts/${slug}/en.md`);
    return matter.default(enFile.content).data as Record<string, unknown>;
  }
  if (!slugExists(slug)) {
    throw new Error(`Post not found: ${slug}`);
  }
  return readPostFile(slug, "en").data;
}

function resolveUploadCoverPath(
  slug: string,
  enData: Record<string, unknown>,
  mimeType: string,
  originalName?: string,
): string {
  const existing =
    typeof enData.coverImage === "string" ? enData.coverImage.trim() : "";
  if (existing.startsWith(`/images/posts/${slug}/`)) {
    return existing;
  }

  const ext = extForMime(mimeType);
  const fromUpload = originalName
    ?.split(/[/\\]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "");
  const filename =
    fromUpload && /\.(jpe?g|png|webp)$/i.test(fromUpload)
      ? fromUpload
      : `${slug}-cover.${ext}`;
  return `/images/posts/${slug}/${filename}`;
}

function makeUploadCoverMutate(coverImage: string) {
  return (
    locale: "en" | "ko",
    data: Record<string, unknown>,
    content: string,
  ) => {
    const next: Record<string, unknown> = {
      ...data,
      coverImage,
      coverImageProvider: "admin-upload",
      coverImageCredit: "Uploaded via admin",
      updatedAt: new Date().toISOString(),
    };
    delete next.coverImageAssetId;
    delete next.coverImageSourceUrl;
    return { data: next, content };
  };
}

async function writeCoverBinary(
  slug: string,
  coverImage: string,
  buffer: Buffer,
  message: string,
) {
  const imageRel = coverImage.replace(/^\//, "");

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    let existingSha: string | undefined;
    try {
      const existing = await readGithubFile(imageRel);
      existingSha = existing.sha;
    } catch {
      existingSha = undefined;
    }
    await writeGithubBinaryFile(imageRel, buffer, message, existingSha);
    return;
  }

  const dest = path.join(process.cwd(), "public", imageRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
}

async function applyCoverPathToPosts(
  slug: string,
  coverImage: string,
  commitMessage: string,
) {
  const mutate = makeUploadCoverMutate(coverImage);

  if (usesRemotePostStore()) {
    await commitPostChanges(slug, commitMessage, mutate);
    await triggerVercelDeploy();
    return { mode: "github" as const };
  }

  for (const locale of ["en", "ko"] as const) {
    const filePath = path.join(process.cwd(), "content", "posts", slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;
    const { data, content } = readPostFile(slug, locale);
    const next = mutate(locale, data, content);
    writePostFile(slug, locale, next.data, next.content);
  }

  return { mode: "local" as const };
}

function imageApisConfigured(): boolean {
  return Boolean(
    process.env.PEXELS_API_KEY?.trim() || process.env.PIXABAY_API_KEY?.trim(),
  );
}

export async function uploadPostCover(
  slug: string,
  file: { buffer: Buffer; mimeType: string; originalName?: string },
) {
  if (!ALLOWED_MIME.has(file.mimeType)) {
    throw new Error("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.");
  }
  if (file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("이미지는 4MB 이하여야 합니다.");
  }

  const enData = await readEnPostData(slug);
  const coverImage = resolveUploadCoverPath(
    slug,
    enData,
    file.mimeType,
    file.originalName,
  );

  await writeCoverBinary(
    slug,
    coverImage,
    file.buffer,
    `admin: upload cover ${slug}`,
  );

  const result = await applyCoverPathToPosts(
    slug,
    coverImage,
    `admin: upload cover ${slug}`,
  );

  return {
    ...result,
    coverImage,
    coverFilename: coverFilenameFromPath(coverImage),
    coverPreviewUrl: githubCoverPreviewUrl(coverImage, Date.now()),
  };
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
    const onGithub =
      usesRemotePostStore() &&
      (provider === "admin-upload" || Boolean(process.env.GITHUB_TOKEN?.trim()));
    return {
      coverImage,
      coverStatus: onGithub ? "github-only" : "missing",
      coverFlagReason: onGithub
        ? "GitHub에 저장됨 — Vercel 재배포 전까지 CDN은 이전 이미지"
        : "배포 번들/CDN에 이미지 파일 없음",
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
    const data = await readEnDataForAdmin(post.slug);
    const cover = await assessCoverFromData(post.slug, data);
    enriched.push({
      ...post,
      ...cover,
      coverFilename: coverFilenameFromPath(cover.coverImage),
      coverImageAlt:
        typeof data.coverImageAlt === "string" ? data.coverImageAlt : undefined,
      coverImageAltKo:
        typeof data.coverImageAltKo === "string" ? data.coverImageAltKo : undefined,
      coverPreviewUrl:
        usesRemotePostStore() && cover.coverImage
          ? githubCoverPreviewUrl(cover.coverImage)
          : undefined,
    });
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

  const enData = await readEnPostData(slug);

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
