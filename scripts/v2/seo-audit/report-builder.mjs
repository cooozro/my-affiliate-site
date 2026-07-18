/**
 * Build admin-only SEO audit markdown (H2/H3 structure + visual dashboard).
 */

import { SEO_AUDIT_TITLE } from "./constants.mjs";
import {
  buildDashboardSummary,
  buildGa4SetupGuide,
  formatAtRiskBlock,
  miniBar,
  progressBarLine,
  scoreStatus,
  targetBarLine,
} from "./report-visual.mjs";

function kstNowLabel(iso) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

function fmtPct(n) {
  return `${n}%`;
}

function checkCell(ok) {
  return ok ? "✅" : "⬜";
}

/**
 * AdSense approval readiness — composite bar + per-indicator coverage bars.
 * @param {object} adsense from buildAdsenseAnalysis
 */
function buildAdsenseReadinessSection(adsense) {
  const lines = [];
  const { icon, label } = scoreStatus(adsense.readiness);

  lines.push("## AdSense 승인 준비도");
  lines.push("");
  lines.push(
    "> Google 게시자 정책의 **‘가치가 낮은 콘텐츠(low-value content)’** 반려 사유를 " +
      "정량 지표로 환산했습니다. 아래는 **AdSense 노출 대상(발행·색인) 글**만 집계합니다.",
  );
  lines.push("");
  lines.push(`- **종합 준비도:** ${icon} **${adsense.readiness}%** _(${label})_`);
  lines.push(
    `- **집계 대상:** 발행·색인 글 **${adsense.counted}편** / 저품질 격리(noindex) **${adsense.hiddenCount}편**`,
  );
  lines.push(
    `- **평균 품질 점수:** **${adsense.avg}점** (목표 ${adsense.target}점) · 색인 포함 전체 평균 ${adsense.avgIncludingHidden}점`,
  );
  lines.push(
    `- **품질 등급:** ${Object.entries(adsense.bands)
      .map(([b, n]) => `${b}등급 ${n}편`)
      .join(" · ")}`,
  );
  lines.push("");
  lines.push(progressBarLine(adsense.readiness));
  lines.push("");

  lines.push("### 승인 점검 지표 (달성률)");
  lines.push("");
  lines.push("| 지표 | 값 | 달성률 | 상태 | 시각화 |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const m of adsense.coverage) {
    const { icon: mIcon } = scoreStatus(m.pct);
    lines.push(
      `| ${m.label} | ${m.value} | **${m.pct}%** | ${mIcon} | ${miniBar(m.pct)} |`,
    );
  }
  lines.push("");
  return lines;
}

/**
 * Low-value-content resolution — the exact rejection reason, as bar charts.
 * @param {object} adsense
 */
function buildLowValueSection(adsense) {
  const lines = [];
  lines.push("## 저가치 콘텐츠(Low-value content) 해결 지표");
  lines.push("");
  lines.push(
    "> 심사 반려 사유였던 **‘가치가 별로 없는 콘텐츠’** 를 해소하기 위한 핵심 지표와 달성 상태입니다. " +
      "각 막대는 발행·색인 글 중 해당 기준을 통과한 비율이며, 🎯 는 목표치입니다.",
  );
  lines.push("");
  for (const m of adsense.lowValue) {
    lines.push(`**${m.label}** (${m.value})`);
    lines.push("");
    lines.push(targetBarLine(m.pct, m.targetLabel ?? `목표 ${m.target}%`, ""));
    lines.push("");
  }

  const gaps = adsense.lowValue.filter((m) => m.pct < (m.target ?? 100));
  if (gaps.length === 0) {
    lines.push(
      "✅ **모든 저가치 판정 지표가 목표를 충족** — 반려 사유(빈약·정보성 부족 콘텐츠)에 대응하는 " +
        "심층 분석·독자 판단·검증 신호·분량·근거가 색인 글 전반에 적용되었습니다.",
    );
  } else {
    lines.push(
      `⚠️ **미달 지표 ${gaps.length}건:** ${gaps
        .map((m) => `${m.label} (${m.pct}%)`)
        .join(", ")} — 해당 글을 우선 보강하세요.`,
    );
  }
  lines.push("");
  return lines;
}

/**
 * Full published-post list with per-post AdSense check status (visualized).
 * @param {object} adsense
 */
function buildFullPostListSection(adsense) {
  const lines = [];
  lines.push("## 전체 글 점검 상태");
  lines.push("");
  lines.push(
    "> 발행·색인 글 전체의 품질 점수와 핵심 점검 통과 여부입니다. " +
      "점검 열: **심층**(편집 해석+우려) · **판단**(평가 기준) · **검증**(교차 검증) · " +
      "**분량**(≥4,500자) · **근거**(모델·근거) · **FAQ**(3쌍+).",
  );
  lines.push("");
  lines.push("| # | Slug | 프로필 | 점수 | 점수바 | 등급 | 심층 | 판단 | 검증 | 분량 | 근거 | FAQ |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  adsense.checkRows.forEach((r, i) => {
    const c = r.checks;
    lines.push(
      `| ${i + 1} | ${r.slug} | ${r.profile} | **${r.total}** | ${miniBar(r.total)} | ${r.band} | ` +
        `${checkCell(c.depth)} | ${checkCell(c.judgment)} | ${checkCell(c.verified)} | ` +
        `${checkCell(c.length)} | ${checkCell(c.evidence)} | ${checkCell(c.faq)} |`,
    );
  });
  lines.push("");

  if (adsense.hidden.length > 0) {
    lines.push("### 저품질 격리(noindex) — AdSense 노출 제외");
    lines.push("");
    lines.push(
      "품질 점수 미달로 색인에서 제외(noindex)해 사이트 전체 가치 희석을 방지한 글입니다.",
    );
    lines.push("");
    lines.push("| Slug | 점수 | 등급 |");
    lines.push("| --- | --- | --- |");
    for (const h of adsense.hidden) {
      lines.push(`| ${h.slug} | ${h.total} | ${h.band} |`);
    }
    lines.push("");
  }
  return lines;
}

/**
 * @param {object} analysis from runSeoAuditAnalysis
 * @param {{ traffic?: object|null, topPages?: Array, meta?: object }} ga
 * @param {object|null} adsense from buildAdsenseAnalysis
 */
export function buildSeoAuditMarkdown(analysis, ga = {}, adsense = null) {
  const { traffic, topPages = [], meta } = ga;
  const lines = [];

  lines.push("## 편집부 개요");
  lines.push("");
  lines.push(
    "> **어드민 전용 draft** — Google sitemap·RSS 미포함, 공개 블로그 URL 비활성. " +
      "SEO 개선 지표 전용 리포트입니다.",
  );
  lines.push("");
  lines.push(`- **생성 시각 (KST):** ${kstNowLabel(analysis.generatedAt)}`);
  lines.push(
    `- **스캔 대상:** 발행 글 ${analysis.publishedSlugCount} slug / ${analysis.localeScanCount} locale 파일`,
  );
  if (analysis.excludedSlugs?.length) {
    lines.push(
      `- **분석 제외:** \`${analysis.excludedSlugs.join("`, `")}\` (인사말·내부 전용)`,
    );
  }
  lines.push("");

  lines.push(...buildDashboardSummary(analysis));

  if (adsense) {
    lines.push(...buildAdsenseReadinessSection(adsense));
    lines.push(...buildLowValueSection(adsense));
  }

  lines.push("## Executive Summary");
  lines.push("");
  lines.push("| 지표 | 점수 | 상태 | 설명 |");
  lines.push("| --- | --- | --- | --- |");
  for (const [name, score, desc] of [
    [
      "SERP 구조·검색 의도 일치",
      analysis.averages.structureIntent,
      "H2 구성, 프로필별 필수 섹션(FAQ·방법론 등)",
    ],
    [
      "JSON-LD 준비도",
      analysis.averages.jsonLdReadiness,
      "Article/FAQ/HowTo 스키마 전제 조건",
    ],
    [
      "저품질 방어",
      analysis.averages.qualityDefense,
      "Guardian 정책·무결성 게이트 기준",
    ],
    [
      "구조화 데이터 적용 가능 비율",
      analysis.jsonLdCoveragePct,
      "JSON-LD 이슈 0건 EN 포스트 비율",
    ],
  ]) {
    const { icon, label } = scoreStatus(score);
    lines.push(`| ${name} | **${fmtPct(score)}** | ${icon} ${label} | ${desc} |`);
    lines.push(`| ↳ 시각화 | | ${progressBarLine(score)} | |`);
  }
  lines.push("");

  lines.push("## GA4 — 최근 7일 유입 (연관성 참고)");
  lines.push("");
  if (traffic && meta?.connected) {
    lines.push("✅ **GA4 연결됨** — 아래 수치는 최근 7일 집계입니다.");
    lines.push("");
    lines.push(`- **API 수집 시각 (KST):** ${meta.fetchedAtKst}`);
    lines.push(`- **속성 ID:** \`${meta.propertyIdMasked}\``);
    if (meta.serviceEmail) {
      lines.push(`- **서비스 계정:** \`${meta.serviceEmail}\``);
    }
    lines.push(`- **집계 기간:** ${meta.dateRange}`);
    lines.push(`- ⚠️ ${meta.reportingLagNote}`);
    lines.push("");
    lines.push("| 지표 | 값 |");
    lines.push("| --- | --- |");
    lines.push(`| Active users | ${traffic.activeUsers7d} |`);
    lines.push(`| Sessions | ${traffic.sessions7d} |`);
    lines.push(`| Page views | ${traffic.pageViews7d} |`);
    lines.push("");
  } else if (meta?.propertyConfigured && meta?.serviceAccountConfigured) {
    lines.push("🚨 **GA4 설정은 있으나 API 조회 실패**");
    lines.push("");
    lines.push(`- **시도 시각 (KST):** ${meta.fetchedAtKst}`);
    lines.push(`- **오류:** ${meta.error ?? "unknown"}`);
    lines.push("");
    lines.push(...buildGa4SetupGuide());
  } else {
    lines.push(...buildGa4SetupGuide());
  }

  if (topPages.length > 0) {
    lines.push("### 상위 블로그 랜딩 (7일)");
    lines.push("");
    lines.push("| 페이지 | 조회수 |");
    lines.push("| --- | --- |");
    for (const row of topPages) {
      lines.push(`| \`${row.path}\` | ${row.views} |`);
    }
    lines.push("");
  }

  lines.push("## SERP 벤치마킹 — 구조·의도 점수");
  lines.push("");
  lines.push(progressBarLine(analysis.averages.structureIntent));
  lines.push("");
  lines.push(
    "발행 EN 글의 H2 구조와 `contentProfile` 템플릿 요구(FAQ, 방법론, 체크리스트 등) 일치도를 0–100%로 산출합니다. `welcome` 등 인사말 페이지는 제외됩니다.",
  );
  lines.push("");

  if (analysis.topStructure.length > 0) {
    lines.push("### 상위 5 (구조 점수)");
    lines.push("");
    lines.push("| Slug | Profile | H2 | 점수 | 상태 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const p of analysis.topStructure) {
      const { icon } = scoreStatus(p.structureScore);
      lines.push(
        `| ${p.slug} | ${p.profile} | ${p.h2Count} | ${fmtPct(p.structureScore)} | ${icon} |`,
      );
    }
    lines.push("");
  }

  lines.push("## 데이터 무결성 — JSON-LD");
  lines.push("");
  lines.push(progressBarLine(analysis.averages.jsonLdReadiness));
  lines.push("");
  lines.push(
    `평균 준비도 **${fmtPct(analysis.averages.jsonLdReadiness)}**, ` +
      `이슈 없는 EN 글 **${fmtPct(analysis.jsonLdCoveragePct)}**.`,
  );
  lines.push("");
  lines.push("### 점검 항목");
  lines.push("");
  lines.push("- ✅ title / description(50–160자) / date");
  lines.push("- ✅ FAQ 섹션 + H3 3쌍 이상 (FAQPage)");
  lines.push("- ✅ coverImage 실파일 존재");
  lines.push("- ✅ checklist 프로필 → HowTo step 후보(번호 목록)");
  lines.push("");

  lines.push("## 저품질 방어 스캔");
  lines.push("");
  lines.push(progressBarLine(analysis.averages.qualityDefense));
  lines.push("");
  lines.push(
    "Guardian `content-policy` + `publish-integrity` (publish phase, repair 없음)로 위험 문구·게이트 실패를 탐지합니다.",
  );
  lines.push("");
  lines.push("### 주의 목록 (구조 < 60 또는 정책 이슈)");
  lines.push("");
  lines.push(...formatAtRiskBlock(analysis.atRisk));

  if (adsense) {
    lines.push(...buildFullPostListSection(adsense));
  }

  lines.push("## 키워드 밀도 샘플 (EN 상위 글)");
  lines.push("");
  for (const p of analysis.topStructure.slice(0, 3)) {
    lines.push(`### ${p.slug}`);
    lines.push("");
    if (p.keywordDensity?.length) {
      lines.push("| 토큰 | 빈도 | 밀도 |");
      lines.push("| --- | --- | --- |");
      for (const k of p.keywordDensity) {
        const densityIcon = k.pct > 3 ? "⚠️" : "✅";
        lines.push(`| ${k.term} | ${k.count} | ${densityIcon} ${k.pct}% |`);
      }
    } else {
      lines.push("_데이터 없음_");
    }
    lines.push("");
  }

  lines.push("## 운영 메모");
  lines.push("");
  lines.push("- 이 글은 **draft:true** 고정 — 자동 발행·replenish 대상 아님");
  lines.push("- 매일 **08:30 KST** `seo-audit-daily` 워크플로우 갱신");
  lines.push("- 라이브 포스트 본문은 **읽기 전용** — 이 모듈은 수정하지 않음");
  lines.push("- `welcome` slug는 인사말 전용 — SEO 구조 점수 산출에서 **제외**");
  lines.push("");

  return lines.join("\n");
}

export function buildFrontmatter(dateKst) {
  return {
    title: SEO_AUDIT_TITLE,
    description:
      "어드민 전용 SEO 자율 분석 리포트 — SERP 구조, JSON-LD, 저품질 방어, GA4 7일 유입.",
    date: dateKst,
    draft: true,
    contentProfile: "editorial",
    tags: ["SEO", "internal", "admin-audit"],
    robots: "noindex, nofollow",
  };
}
