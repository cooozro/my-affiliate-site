/**
 * AdSense approval-readiness analysis for the admin SEO audit report.
 *
 * Wraps the heuristic quality scorer (scripts/adsense-quality-score.mjs) and
 * turns it into concrete, target-based indicators — with special focus on the
 * "low-value content" rejection reason (Google Publisher Policy: thin/low-value).
 */

import { computeAdsenseQuality } from "../../adsense-quality-score.mjs";

/** Minimum heuristic score we treat as an A-tier / hero post. */
export const A_TIER_THRESHOLD = 75;
/** Average score target for the AdSense-visible set. */
export const AVG_SCORE_TARGET = 88;
/** Minimum KO body length we treat as "sufficient depth" (not thin). */
export const SUFFICIENT_KO_CHARS = 4500;

// Genuine low-value signals per Google Publisher Policy (thin / no original value).
// "no-named-sections" is intentionally excluded — checklists/explainers legitimately
// have no product/scenario H2 blocks yet still carry original editorial value.
const LOW_VALUE_FLAGS = new Set([
  "thin-ko",
  "generic-no-models",
  "no-editorial-signal",
]);

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function hasEvidence(r) {
  return (
    (r.modelCount ?? 0) >= 1 ||
    (r.products ?? 0) >= 3 ||
    (r.picks ?? 0) >= 3 ||
    (r.scenarios ?? 0) >= 3
  );
}

function noLowValueFlags(r) {
  return !(r.flags ?? []).some((f) => LOW_VALUE_FLAGS.has(f));
}

/**
 * Per-post AdSense check row (booleans + compact score).
 */
function toCheckRow(r) {
  return {
    slug: r.slug,
    title: r.title,
    profile: r.profile,
    total: r.total,
    band: r.band,
    checks: {
      aTier: r.total >= A_TIER_THRESHOLD,
      depth: (r.flags ?? []).includes("editorial-depth"),
      judgment: Boolean(r.hasWhy),
      verified: Boolean(r.hasExp),
      length: (r.koChars ?? 0) >= SUFFICIENT_KO_CHARS,
      evidence: hasEvidence(r),
      faq: (r.faq ?? 0) >= 3,
      clean: noLowValueFlags(r),
    },
  };
}

/**
 * Build the AdSense-readiness analysis object consumed by the report builder.
 * @param {string} [root]
 */
export function buildAdsenseAnalysis(root = process.cwd()) {
  const payload = computeAdsenseQuality(root);
  const rows = payload.rows ?? [];
  const total = rows.length;

  const count = (fn) => rows.filter(fn).length;

  const aTier = count((r) => r.total >= A_TIER_THRESHOLD);
  const depth = count((r) => (r.flags ?? []).includes("editorial-depth"));
  const judgment = count((r) => r.hasWhy);
  const verified = count((r) => r.hasExp);
  const length = count((r) => (r.koChars ?? 0) >= SUFFICIENT_KO_CHARS);
  const evidence = count(hasEvidence);
  const faqOk = count((r) => (r.faq ?? 0) >= 3);
  const clean = count(noLowValueFlags);

  // Coverage indicators — each is % of the AdSense-visible set that passes.
  const coverage = [
    { key: "aTier", label: "A등급(75점+) 달성", part: aTier, target: 100 },
    { key: "avg", label: "평균 품질 점수", part: null, pctOverride: Math.min(100, Math.round((payload.avg / AVG_SCORE_TARGET) * 100)), value: `${payload.avg}점`, target: 100, targetLabel: `목표 ${AVG_SCORE_TARGET}점` },
    { key: "depth", label: "심층 편집 분석(해석+우려)", part: depth, target: 100 },
    { key: "judgment", label: "독자적 판단·평가 기준", part: judgment, target: 100 },
    { key: "verified", label: "1차 검증 신호(교차 검증)", part: verified, target: 100 },
    { key: "length", label: `충분한 분량(≥${SUFFICIENT_KO_CHARS.toLocaleString()}자)`, part: length, target: 100 },
    { key: "evidence", label: "실모델·근거 제시", part: evidence, target: 100 },
    { key: "faq", label: "FAQ 3쌍 이상", part: faqOk, target: 100 },
    { key: "clean", label: "저가치 플래그 0건", part: clean, target: 100 },
  ].map((m) => ({
    ...m,
    pct: m.pctOverride ?? pct(m.part, total),
    value: m.value ?? (m.part != null ? `${m.part}/${total}` : ""),
  }));

  // Low-value-content resolution — the exact rejection reason ("가치가 별로 없는 콘텐츠").
  // Focuses on genuine thin/original-value signals; product-model richness ("evidence")
  // stays in the general coverage table since it does not apply to every profile.
  const lowValue = coverage.filter((m) =>
    ["aTier", "depth", "judgment", "verified", "length", "clean"].includes(m.key),
  );

  // Composite readiness = mean of coverage percentages.
  const readiness = Math.round(
    coverage.reduce((s, m) => s + m.pct, 0) / (coverage.length || 1),
  );

  return {
    generatedAt: payload.generatedAt,
    counted: total,
    avg: payload.avg,
    avgIncludingHidden: payload.avgIncludingHidden,
    hiddenCount: payload.hiddenCount,
    bands: payload.bands,
    target: AVG_SCORE_TARGET,
    readiness,
    coverage,
    lowValue,
    checkRows: rows.map(toCheckRow).sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug)),
    hidden: payload.hidden ?? [],
  };
}
