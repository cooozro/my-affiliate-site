import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { sortAdminPostRows } from "@/lib/admin-only-posts";
import { listGithubDirectory, readGithubFile } from "@/lib/admin-services";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type AdminPostRow = {
  slug: string;
  titleEn: string;
  titleKo: string;
  draft: boolean;
  date: string;
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  hasEn: boolean;
  hasKo: boolean;
  liveData: boolean;
  /** false = admin-visible draft that must not fill the publish buffer */
  automationBuffer?: boolean;
  /** true = human-written in admin — excluded from scheduler write/publish counts */
  manualOrigin?: boolean;
};

function sortAdminRows(rows: AdminPostRow[]): AdminPostRow[] {
  return sortAdminPostRows(rows);
}

function listSlugDirs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function readPostFile(slug: string, locale: "en" | "ko") {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content: content.trim(), filePath };
}

export function writePostFile(
  slug: string,
  locale: "en" | "ko",
  data: Record<string, unknown>,
  content: string,
) {
  const dir = path.join(POSTS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
  return filePath;
}

export function listPostsForAdmin(): AdminPostRow[] {
  const rows = listSlugDirs()
    .map((slug) => {
      const enPath = path.join(POSTS_DIR, slug, "en.md");
      const koPath = path.join(POSTS_DIR, slug, "ko.md");
      const hasEn = fs.existsSync(enPath);
      const hasKo = fs.existsSync(koPath);

      let titleEn = slug;
      let titleKo = slug;
      let draft = false;
      let date = "";
      let updatedAt: string | undefined;
      let publishedAt: string | undefined;
      let createdAt: string | undefined;
      let liveData = false;
      let automationBuffer: boolean | undefined;
      let manualOrigin: boolean | undefined;

      if (hasEn) {
        const en = readPostFile(slug, "en");
        titleEn = String(en.data.title ?? slug);
        draft = Boolean(en.data.draft);
        date = String(en.data.date ?? "");
        updatedAt = en.data.updatedAt ? String(en.data.updatedAt) : undefined;
        publishedAt = en.data.publishedAt
          ? String(en.data.publishedAt)
          : undefined;
        createdAt = en.data.createdAt ? String(en.data.createdAt) : undefined;
        liveData = Boolean(en.data.liveData);
        if (typeof en.data.automationBuffer === "boolean") {
          automationBuffer = en.data.automationBuffer;
        }
        if (en.data.manualOrigin === true || en.data.writingProvider === "manual") {
          manualOrigin = true;
        }
      }

      if (hasKo) {
        const ko = readPostFile(slug, "ko");
        titleKo = String(ko.data.title ?? slug);
        if (!hasEn) {
          draft = Boolean(ko.data.draft);
          date = String(ko.data.date ?? "");
          if (typeof ko.data.automationBuffer === "boolean") {
            automationBuffer = ko.data.automationBuffer;
          }
        }
      }

      return {
        slug,
        titleEn,
        titleKo,
        draft,
        date,
        updatedAt,
        publishedAt,
        createdAt,
        hasEn,
        hasKo,
        liveData,
        automationBuffer,
        manualOrigin,
      };
    })
    .filter((row) => row.hasEn || row.hasKo);
  return sortAdminRows(rows);
}

async function buildAdminRowFromGithub(slug: string): Promise<AdminPostRow | null> {
  let titleEn = slug;
  let titleKo = slug;
  let draft = false;
  let date = "";
  let updatedAt: string | undefined;
  let publishedAt: string | undefined;
  let createdAt: string | undefined;
  let liveData = false;
  let automationBuffer: boolean | undefined;
  let manualOrigin: boolean | undefined;
  let hasEn = false;
  let hasKo = false;

  for (const locale of ["en", "ko"] as const) {
    try {
      const { content } = await readGithubFile(`content/posts/${slug}/${locale}.md`);
      const { data } = matter(content);
      hasEn = locale === "en" ? true : hasEn;
      hasKo = locale === "ko" ? true : hasKo;

      if (locale === "en") {
        titleEn = String(data.title ?? slug);
        draft = Boolean(data.draft);
        date = String(data.date ?? "");
        updatedAt = data.updatedAt ? String(data.updatedAt) : undefined;
        publishedAt = data.publishedAt ? String(data.publishedAt) : undefined;
        createdAt = data.createdAt ? String(data.createdAt) : undefined;
        liveData = Boolean(data.liveData);
        if (typeof data.automationBuffer === "boolean") {
          automationBuffer = data.automationBuffer;
        }
        if (data.manualOrigin === true || data.writingProvider === "manual") {
          manualOrigin = true;
        }
      }
      if (locale === "ko") {
        titleKo = String(data.title ?? slug);
        if (!hasEn) {
          draft = Boolean(data.draft);
          date = String(data.date ?? "");
          if (typeof data.automationBuffer === "boolean") {
            automationBuffer = data.automationBuffer;
          }
        }
      }
    } catch {
      /* locale missing on GitHub */
    }
  }

  if (!hasEn && !hasKo) return null;

  return {
    slug,
    titleEn,
    titleKo,
    draft,
    date,
    updatedAt,
    publishedAt,
    createdAt,
    hasEn,
    hasKo,
    liveData,
    automationBuffer,
    manualOrigin,
  };
}

/** Live GitHub main — avoids stale Vercel bundle after admin delete. */
export async function listPostsForAdminLive(): Promise<AdminPostRow[]> {
  if (usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim()) {
    try {
      const entries = await listGithubDirectory("content/posts");
      const slugs = entries
        .filter((entry) => entry.type === "dir")
        .map((entry) => entry.name ?? entry.path.split("/").pop() ?? "")
        .filter(Boolean);

      // Batch reads to finish faster; fall back below on rate-limit / API errors.
      const rows: AdminPostRow[] = [];
      const batchSize = 8;
      for (let i = 0; i < slugs.length; i += batchSize) {
        const batch = slugs.slice(i, i + batchSize);
        const built = await Promise.all(
          batch.map((slug) => buildAdminRowFromGithub(slug)),
        );
        for (const row of built) {
          if (row) rows.push(row);
        }
      }
      return sortAdminRows(rows);
    } catch (error) {
      console.error(
        "Admin live GitHub list failed; using deploy bundle fallback:",
        error instanceof Error ? error.message : error,
      );
      return listPostsForAdmin();
    }
  }

  return listPostsForAdmin();
}

function kstDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function publishPostLocally(slug: string) {
  const publishDate = kstDateString();
  const updatedAt = new Date().toISOString();

  for (const locale of ["en", "ko"] as const) {
    const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;

    const { data, content } = readPostFile(slug, locale);
    const next: Record<string, unknown> = {
      ...data,
      draft: false,
      date: publishDate,
      updatedAt,
      publishedAt: updatedAt,
    };
    delete next.createdAt;
    writePostFile(slug, locale, next, content);
  }
}

export function draftPostLocally(slug: string) {
  const updatedAt = new Date().toISOString();

  for (const locale of ["en", "ko"] as const) {
    const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;

    const { data, content } = readPostFile(slug, locale);
    const next: Record<string, unknown> = {
      ...data,
      draft: true,
      updatedAt,
      createdAt: data.createdAt ?? updatedAt,
    };
    writePostFile(slug, locale, next, content);
  }
}

export function deletePostLocally(slug: string) {
  const dir = path.join(POSTS_DIR, slug);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function slugExists(slug: string): boolean {
  return fs.existsSync(path.join(POSTS_DIR, slug));
}

export function isServerlessRuntime(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NETLIFY === "true"
  );
}

/** Production deploys have a read-only bundle — mutations go through GitHub API. */
export function usesRemotePostStore(): boolean {
  return isServerlessRuntime();
}

export function assertGithubAdminConfigured(): void {
  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error(
      "Vercel(서버리스)에서는 GITHUB_TOKEN 환경변수가 필요합니다. " +
        "GitHub PAT(repo 권한)를 발급해 Vercel → Project → Settings → Environment Variables에 " +
        "GITHUB_TOKEN으로 추가한 뒤 재배포하세요.",
    );
  }
}
