import type { AdminPostRow } from "@/lib/posts-admin";
import { TARGET_DRAFT_COUNT } from "@/lib/publish-schedule";

/** Admin-only SEO audit report — never public, never manually publishable. */
export const SEO_AUDIT_REPORT_SLUG = "aipick-seo-precision-report";

/** Editorial / internal drafts — not automation buffer slots. */
export const ADMIN_DRAFT_EXCLUDE = new Set<string>([
  "welcome",
  "adsense-seo-checklist",
  SEO_AUDIT_REPORT_SLUG,
]);

const ADMIN_PUBLISH_BLOCKED = new Set<string>([SEO_AUDIT_REPORT_SLUG]);

export function isAdminPublishBlocked(slug: string): boolean {
  return ADMIN_PUBLISH_BLOCKED.has(slug);
}

export function isAutomationBufferDraft(row: AdminPostRow): boolean {
  return row.draft && !ADMIN_DRAFT_EXCLUDE.has(row.slug);
}

/** Admin list sort — 작성일 only (never updatedAt). */
export function adminPostWrittenIso(row: AdminPostRow): string {
  if (row.draft) {
    return row.createdAt ?? row.date;
  }
  return row.publishedAt ?? row.date;
}

function adminPostSortTime(row: AdminPostRow): number {
  const t = new Date(adminPostWrittenIso(row)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Pinned admin list order:
 * 1. SEO audit report (always top)
 * 2. Automation buffer drafts (max 2, FIFO by createdAt)
 * 3. Everything else by publish/draft date desc
 */
export function sortAdminPostRows(rows: AdminPostRow[]): AdminPostRow[] {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  const pinned: AdminPostRow[] = [];
  const report = bySlug.get(SEO_AUDIT_REPORT_SLUG);
  if (report) {
    pinned.push(report);
  }

  const bufferDrafts = rows
    .filter((row) => isAutomationBufferDraft(row))
    .sort((a, b) => adminPostSortTime(a) - adminPostSortTime(b))
    .slice(0, TARGET_DRAFT_COUNT);
  pinned.push(...bufferDrafts);

  const pinnedSlugs = new Set(pinned.map((row) => row.slug));
  const rest = rows
    .filter((row) => !pinnedSlugs.has(row.slug))
    .sort((a, b) => {
      const diff = adminPostSortTime(b) - adminPostSortTime(a);
      if (diff !== 0) return diff;
      return b.slug.localeCompare(a.slug);
    });

  return [...pinned, ...rest];
}

export function isAdminPinnedPost(slug: string, bufferSlugs: string[]): boolean {
  if (slug === SEO_AUDIT_REPORT_SLUG) return true;
  return bufferSlugs.includes(slug);
}

/** Preview locale when EN file is missing (KO-only internal reports). */
export function adminPreviewLocale(post: {
  slug: string;
  hasEn: boolean;
  hasKo: boolean;
}): "en" | "ko" {
  if (isAdminPublishBlocked(post.slug)) return "ko";
  if (post.hasEn) return "en";
  return post.hasKo ? "ko" : "en";
}
