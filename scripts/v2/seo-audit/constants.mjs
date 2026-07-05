/**
 * Admin-only SEO audit draft — isolated from automation & publish pipeline.
 */

export const SEO_AUDIT_SLUG = "aipick-seo-precision-report";

export const SEO_AUDIT_TITLE = "[aipick SEO 정밀 분석: 최상단 노출 리포트]";

export const SEO_AUDIT_DESCRIPTION =
  "어드민 전용 SEO 자율 분석 리포트. Google 미색인 draft — 발행·자동화 버퍼 대상 아님.";

/** Slugs excluded from automation buffer / replenish (same pattern as adsense-seo-checklist). */
export const SEO_ADMIN_DRAFT_SLUGS = new Set([
  "welcome",
  "adsense-seo-checklist",
  SEO_AUDIT_SLUG,
]);

export const SEO_AUDIT_REPORT_JSON = "data/automation/seo-audit-latest.json";
