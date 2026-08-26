/**
 * AIPICK editorial transparency gates (variant).
 * Core never invents PSI/SBI scores — this module only checks that opaque
 * score columns have a weight legend, skip/risk blocks exist on comparison
 * profiles, headings are spec-backed, and USD/KRW tokens stay in lockstep.
 */

export const COMPARISON_PROFILES = new Set([
  "buying-guide",
  "head-to-head",
  "scenario-guide",
  "model-deep-dive",
]);

const SKIP_SIGNAL_RE =
  /Who should skip|이런 분은 패스|건너뛰|should skip|구매를 멈추|Review concern|검토 시 우려|Who should buy which|누구에게 무엇을|Buy \/ wait \/ skip|지금 사기 \/ 기다리기/i;

const BARRIER_RES = [
  /bloat|adware|광고|블로트|팝업/i,
  /service center|서비스\s*센터|as\s*센터|warranty|워런티|보증|로컬\s*서비스/i,
  /cable|케이블|포트|thunderbolt|호환|usb[-\s]?c/i,
  /무게|weight|휴대|portable|무거/i,
  /설치|install|회로|amper|전력|window kit|창틀/i,
];

const VAGUE_HEADING_RE =
  /프로급|플래그십\s*급|압도적|최강|pro-grade|flagship-class|blazing(?:ly)?\s+fast|ultimate\s+performance/i;

const SPEC_TOKEN_RE =
  /\b(\d+\s*Gbps|\d+\s*Hz|AMOLED|OLED|IP\d{2}|\d+\s*Wh|\d+\s*W|\d+\s*dB|LFP|USB[-\s]?C|Wi-?Fi\s*6e?|Thunderbolt)\b/i;

const SCORE_HEADER_RE = /^(점수|스코어|score|index|psi|sbi|등급)$/i;
const WEIGHT_LEGEND_RE =
  /가중치|weight(?:s|ing)?|IP\s*등급|battery|배터리|무게|price|가격|수명|cycle|listed/i;

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function hasSkipOrRiskBlock(body) {
  return SKIP_SIGNAL_RE.test(String(body || ""));
}

export function skipBarrierCount(body) {
  const text = String(body || "");
  return BARRIER_RES.filter((re) => re.test(text)).length;
}

export function hasExpandedSkipCoverage(body) {
  return skipBarrierCount(body) >= 2;
}

export function vagueHeadingsWithoutSpec(body, title = "") {
  const lines = [`## ${title}`, ...(String(body || "").match(/^#{1,3}\s+.+$/gm) || [])];
  return lines
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim())
    .filter((heading) => VAGUE_HEADING_RE.test(heading) && !SPEC_TOKEN_RE.test(heading));
}

export function scoreTablesMissingLegend(body) {
  const lines = String(body || "").split("\n");
  const missing = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!lines[i].trim().startsWith("|") || !isSeparatorRow(lines[i + 1])) continue;
    const headers = splitTableRow(lines[i]);
    if (!headers.some((h) => SCORE_HEADER_RE.test(h))) continue;
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|")) j += 1;
    const after = [];
    for (let k = j; k < lines.length && after.length < 4; k += 1) {
      const t = lines[k].trim();
      if (!t) continue;
      if (t.startsWith("#")) break;
      after.push(t);
    }
    if (!WEIGHT_LEGEND_RE.test(after.join(" "))) {
      missing.push(headers.join(" | "));
    }
  }
  return missing;
}

export function usdKrwLockstepIssues(body) {
  const text = String(body || "");
  const krwTokens = [...text.matchAll(/\{\{\s*krw:([\d.]+)\s*\}\}/gi)].map(
    (m) => m[1],
  );
  const dollars = [...text.matchAll(/\$\s*([\d]+(?:\.\d{1,2})?)/g)].map((m) => m[1]);
  if (krwTokens.length === 0 || dollars.length === 0) return [];
  const issues = [];
  for (const token of krwTokens) {
    const matched = dollars.some((d) => Math.abs(Number(d) - Number(token)) < 0.001);
    if (!matched) {
      issues.push(`{{krw:${token}}} does not match a USD MSRP in the same body`);
    }
  }
  return issues;
}

export function auditEditorialTransparency(body, { profile, title = "", liveData = false } = {}) {
  const warnings = [];
  const errors = [];
  if (COMPARISON_PROFILES.has(profile) && !hasSkipOrRiskBlock(body)) {
    errors.push(
      "comparison profile needs a skip/risk block (Who should skip / 검토 시 우려 / 이런 분은 패스)",
    );
  }
  const vague = vagueHeadingsWithoutSpec(body, title);
  if (vague.length > 0) {
    warnings.push(
      `vague heading without a verifiable spec token: ${vague.slice(0, 3).join("; ")}`,
    );
  }
  const missingLegend = scoreTablesMissingLegend(body);
  if (missingLegend.length > 0) {
    errors.push(
      "score/index column needs a weight legend in the next paragraph (do not invent unlabeled PSI/SBI scores)",
    );
  }
  if (liveData) {
    for (const issue of usdKrwLockstepIssues(body)) warnings.push(issue);
  }
  return { errors, warnings };
}
