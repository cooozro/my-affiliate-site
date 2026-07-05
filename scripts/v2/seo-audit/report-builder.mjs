/**
 * Build admin-only SEO audit markdown (H2/H3 structure).
 */

import { SEO_AUDIT_TITLE } from "./constants.mjs";

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

/**
 * @param {object} analysis from runSeoAuditAnalysis
 * @param {{ traffic?: object|null, topPages?: Array }} ga
 */
export function buildSeoAuditMarkdown(analysis, ga = {}) {
  const { traffic, topPages = [] } = ga;
  const lines = [];

  lines.push("## 편집부 개요");
  lines.push("");
  lines.push(
    "> **어드민 전용 draft** — Google sitemap·RSS 미포함, 공개 블로그 URL 비활성. " +
      "SEO 개선 지표 전용 리포트입니다.",
  );
  lines.push("");
  lines.push(`- **생성 시각 (KST):** ${kstNowLabel(analysis.generatedAt)}`);
  lines.push(`- **스캔 대상:** 발행 글 ${analysis.publishedSlugCount} slug / ${analysis.localeScanCount} locale 파일`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push("| 지표 | 점수 | 설명 |");
  lines.push("| --- | --- | --- |");
  lines.push(
    `| SERP 구조·검색 의도 일치 | ${fmtPct(analysis.averages.structureIntent)} | H2 구성, 프로필별 필수 섹션(FAQ·방법론 등) |`,
  );
  lines.push(
    `| JSON-LD 준비도 | ${fmtPct(analysis.averages.jsonLdReadiness)} | Article/FAQ/HowTo 스키마 전제 조건 |`,
  );
  lines.push(
    `| 저품질 방어 | ${fmtPct(analysis.averages.qualityDefense)} | Guardian 정책·무결성 게이트 기준 |`,
  );
  lines.push(
    `| 구조화 데이터 적용 가능 비율 | ${fmtPct(analysis.jsonLdCoveragePct)} | JSON-LD 이슈 0건 EN 포스트 비율 |`,
  );
  lines.push("");

  lines.push("## GA4 — 최근 7일 유입 (연관성 참고)");
  lines.push("");
  if (traffic) {
    lines.push("| 지표 | 값 |");
    lines.push("| --- | --- |");
    lines.push(`| Active users | ${traffic.activeUsers7d} |`);
    lines.push(`| Sessions | ${traffic.sessions7d} |`);
    lines.push(`| Page views | ${traffic.pageViews7d} |`);
    lines.push("");
  } else {
    lines.push(
      "_GA4 미연결 — `GA4_PROPERTY_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` 설정 시 자동 집계._",
    );
    lines.push("");
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
  lines.push(
    "발행 EN 글의 H2 구조와 `contentProfile` 템플릿 요구(FAQ, 방법론, 체크리스트 등) 일치도를 0–100%로 산출합니다.",
  );
  lines.push("");

  if (analysis.topStructure.length > 0) {
    lines.push("### 상위 5 (구조 점수)");
    lines.push("");
    lines.push("| Slug | Profile | H2 | 점수 |");
    lines.push("| --- | --- | --- | --- |");
    for (const p of analysis.topStructure) {
      lines.push(
        `| ${p.slug} | ${p.profile} | ${p.h2Count} | ${fmtPct(p.structureScore)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## 데이터 무결성 — JSON-LD");
  lines.push("");
  lines.push(
    `평균 준비도 **${fmtPct(analysis.averages.jsonLdReadiness)}**, ` +
      `이슈 없는 EN 글 **${fmtPct(analysis.jsonLdCoveragePct)}**.`,
  );
  lines.push("");
  lines.push("### 점검 항목");
  lines.push("");
  lines.push("- title / description(50–160자) / date");
  lines.push("- FAQ 섹션 + H3 3쌍 이상 (FAQPage)");
  lines.push("- coverImage 실파일 존재");
  lines.push("- checklist 프로필 → HowTo step 후보(번호 목록)");
  lines.push("");

  lines.push("## 저품질 방어 스캔");
  lines.push("");
  lines.push(
    "Guardian `content-policy` + `publish-integrity` (publish phase, repair 없음)로 위험 문구·게이트 실패를 탐지합니다.",
  );
  lines.push("");

  if (analysis.atRisk.length > 0) {
    lines.push("### 주의 목록 (구조 < 60 또는 정책 이슈)");
    lines.push("");
    for (const p of analysis.atRisk) {
      lines.push(`#### ${p.slug} (${p.locale})`);
      lines.push("");
      lines.push(`- 구조: ${fmtPct(p.structureScore)} | JSON-LD: ${fmtPct(p.jsonLdScore)} | 방어: ${fmtPct(p.riskScore)}`);
      if (p.riskIssues.length) {
        lines.push(`- 이슈: ${p.riskIssues.slice(0, 3).join("; ")}`);
      }
      if (p.jsonLdIssues.length) {
        lines.push(`- JSON-LD: ${p.jsonLdIssues.join("; ")}`);
      }
      lines.push("");
    }
  } else {
    lines.push("_현재 게이트 기준 고위험 slug 없음._");
    lines.push("");
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
        lines.push(`| ${k.term} | ${k.count} | ${k.pct}% |`);
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
