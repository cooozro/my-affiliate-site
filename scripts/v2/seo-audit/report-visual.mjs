/**
 * Visual helpers for admin SEO audit markdown (isolated — draft report only).
 */

/** @returns {{ emoji: string, label: string, icon: string }} */
export function scoreStatus(pct) {
  if (pct >= 80) return { emoji: "🟩", label: "좋음", icon: "✅" };
  if (pct >= 50) return { emoji: "🟨", label: "보통", icon: "⚠️" };
  return { emoji: "🟥", label: "경고", icon: "🚨" };
}

/**
 * Unicode progress bar — renders in ReactMarkdown without raw HTML.
 * @param {number} pct 0–100
 * @param {number} [width]
 */
export function progressBarLine(pct, width = 18) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const { emoji, label, icon } = scoreStatus(clamped);
  const filled = Math.round((clamped / 100) * width);
  const bar = emoji.repeat(filled) + "⬜".repeat(Math.max(0, width - filled));
  return `${icon} **${clamped}%** ${bar} _(${label})_`;
}

/**
 * Compact emoji bar (no label) for use inside table cells.
 * @param {number} pct 0–100
 * @param {number} [width]
 */
export function miniBar(pct, width = 10) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const { emoji } = scoreStatus(clamped);
  const filled = Math.round((clamped / 100) * width);
  return emoji.repeat(filled) + "⬜".repeat(Math.max(0, width - filled));
}

/**
 * Labeled progress bar with an explicit target annotation (for AdSense goals).
 * @param {number} pct
 * @param {string} [targetLabel]
 * @param {string} [valueLabel]
 */
export function targetBarLine(pct, targetLabel = "목표 100%", valueLabel = "") {
  const base = progressBarLine(pct);
  const suffix = valueLabel ? ` — ${valueLabel}` : "";
  return `${base}${suffix} · 🎯 ${targetLabel}`;
}

/**
 * @param {string} title
 * @param {number} pct
 * @param {string[]} bullets
 */
export function sectionWithBar(title, pct, bullets) {
  const lines = [];
  lines.push(`### ${title}`);
  lines.push("");
  lines.push(progressBarLine(pct));
  lines.push("");
  for (const b of bullets) {
    lines.push(`- ${b}`);
  }
  lines.push("");
  return lines;
}

/**
 * @param {object} analysis
 */
export function buildDashboardSummary(analysis) {
  const { averages, jsonLdCoveragePct, atRisk, excludedSlugs } = analysis;
  const opsScore = averages.structureIntent;
  const revenueScore = Math.round(
    (averages.jsonLdReadiness + jsonLdCoveragePct) / 2,
  );
  const healthScore = averages.qualityDefense;
  const atRiskCount = atRisk.length;

  const lines = [];
  lines.push("## 대시보드 요약");
  lines.push("");
  lines.push(
    `> 마지막 갱신 기준 **3대 핵심 축** — 운영 로직 · 수익성/효율 · 시스템 건강도`,
  );
  lines.push("");

  lines.push("| 축 | 점수 | 상태 |");
  lines.push("| --- | --- | --- |");
  for (const [name, score] of [
    ["운영 로직 상태", opsScore],
    ["수익성·효율성 지표", revenueScore],
    ["시스템 건강도", healthScore],
  ]) {
    const { icon, label } = scoreStatus(score);
    lines.push(`| ${name} | **${score}%** | ${icon} ${label} |`);
  }
  lines.push("");

  lines.push(...sectionWithBar("운영 로직 상태", opsScore, [
    `SERP 구조·검색 의도 일치 **${averages.structureIntent}%**`,
    `스캔 대상 **${analysis.publishedSlugCount}** slug (welcome 등 ${excludedSlugs.length}건 제외)`,
    `locale 파일 **${analysis.localeScanCount}**개 분석`,
  ]));

  lines.push(...sectionWithBar("수익성·효율성 지표", revenueScore, [
    `JSON-LD 준비도 **${averages.jsonLdReadiness}%**`,
    `구조화 데이터 적용 가능 EN 글 **${jsonLdCoveragePct}%**`,
    `스키마(FAQ·HowTo) 전제 조건 충족률 기준`,
  ]));

  const healthBullets = [
    `저품질 방어(Guardian) **${averages.qualityDefense}%**`,
    `정책·무결성 게이트 publish phase 스캔`,
  ];
  if (atRiskCount > 0) {
    healthBullets.push(
      `🚨 **수동 확인 권장 ${atRiskCount}건** — 구조 < 60% 또는 정책 이슈`,
    );
  } else {
    healthBullets.push("✅ 고위험 slug 없음");
  }
  lines.push(...sectionWithBar("시스템 건강도", healthScore, healthBullets));
  lines.push("---");
  lines.push("");

  return lines;
}

export function buildGa4SetupGuide() {
  const lines = [];
  lines.push("### GA4 연결 가이드");
  lines.push("");
  lines.push("> ⚠️ **현재 GA4 미연결** — 아래 위치에 Secret/환경변수를 등록하면 자동 집계됩니다.");
  lines.push("");
  lines.push("| 용도 | 설정 위치 | 변수명 |");
  lines.push("| --- | --- | --- |");
  lines.push(
    "| **매일 SEO 리포트** (08:30 KST) | GitHub → repo → **Settings → Secrets → Actions** | `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` |",
  );
  lines.push(
    "| **어드민 대시보드** GA 위젯 | Vercel → Project → **Settings → Environment Variables** | 동일 |",
  );
  lines.push(
    "| **로컬 테스트** (`npm run seo-audit:update`) | 프로젝트 루트 **`.env`** (git 제외) | 동일 |",
  );
  lines.push("");
  lines.push("**값 입력 방법**");
  lines.push("");
  lines.push(
    "0. **GCP → API 및 서비스 → 라이브러리** → `Google Analytics Data API` **사용 설정** (403 오류 시 필수)",
  );
  lines.push(
    "1. `GA4_PROPERTY_ID` — GA4 관리 → 속성 설정 → **속성 ID** (숫자만, 예: `123456789`)",
  );
  lines.push(
    "2. `GOOGLE_SERVICE_ACCOUNT_JSON` — GCP 서비스 계정 JSON **전체**를 한 줄로 붙여넣기",
  );
  lines.push(
    "3. GA4 → 속성 액세스 관리 → 서비스 계정 이메일에 **뷰어(Viewer)** 권한 부여",
  );
  lines.push("");
  lines.push(
    "**API 활성화 링크:** [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com) (서비스 계정이 속한 GCP 프로젝트에서 Enable)",
  );
  lines.push("**로컬 `.env` 예시**");
  lines.push("");
  lines.push("```");
  lines.push("GA4_PROPERTY_ID=123456789");
  lines.push(
    'GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}',
  );
  lines.push("```");
  lines.push("");
  lines.push(
    "_이미 `blog-automation` 등에 `GOOGLE_SERVICE_ACCOUNT_JSON`이 있다면 SEO audit도 동일 Secret을 재사용합니다. `GA4_PROPERTY_ID`만 추가하면 됩니다._",
  );
  lines.push("");
  return lines;
}

/**
 * @param {Array} atRisk
 */
export function formatAtRiskBlock(atRisk) {
  const lines = [];
  if (atRisk.length === 0) {
    lines.push("✅ _현재 게이트 기준 고위험 slug 없음._");
    lines.push("");
    return lines;
  }

  lines.push(
    `> 🚨 **즉시 확인 권장 — ${atRisk.length}건** (구조 < 60% 또는 정책·무결성 이슈)`,
  );
  lines.push("");
  for (const p of atRisk) {
    const structIcon = scoreStatus(p.structureScore).icon;
    const riskIcon = p.riskIssues.length > 0 ? "🚨" : "⚠️";
    lines.push(`#### ${riskIcon} ${p.slug} (\`${p.locale}\`)`);
    lines.push("");
    lines.push(
      `- ${structIcon} 구조 **${p.structureScore}%** | JSON-LD **${p.jsonLdScore}%** | 방어 **${p.riskScore}%**`,
    );
    if (p.riskIssues.length) {
      lines.push(`- 🚨 **이슈:** ${p.riskIssues.slice(0, 3).join("; ")}`);
    }
    if (p.jsonLdIssues.length) {
      lines.push(`- ⚠️ JSON-LD: ${p.jsonLdIssues.join("; ")}`);
    }
    lines.push("");
  }
  return lines;
}
