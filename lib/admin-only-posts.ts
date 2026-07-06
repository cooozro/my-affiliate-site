/** Admin-only SEO audit report — never public, never manually publishable. */
export const SEO_AUDIT_REPORT_SLUG = "aipick-seo-precision-report";

const ADMIN_PUBLISH_BLOCKED = new Set<string>([SEO_AUDIT_REPORT_SLUG]);

export function isAdminPublishBlocked(slug: string): boolean {
  return ADMIN_PUBLISH_BLOCKED.has(slug);
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
