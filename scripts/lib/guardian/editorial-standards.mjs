/**
 * Pipeline Guardian — editorial standards & methodology blocks (do not import outside guardian/index).
 * Shared editorial copy for buying-guide posts.
 * Use in Cursor drafts — do NOT claim proprietary seller APIs.
 */

export const MISLEADING_SOURCE_PATTERNS = [
  /`sale_price_usd`/i,
  /`spec_json`/i,
  /`order_count_30d`/i,
  /`return_rate`/i,
  /`review_score`/i,
  /\|\s*[^\n|]*\|\s*판매자\s*API\s*\|/i,
  /\|\s*[^\n|]*\|\s*셀러\s*API\s*\|/i,
  /\|\s*[^\n|]*\|\s*Seller API\s*\|/i,
  /\|\s*[^\n|]*\|\s*Product API\s*\|/i,
  /\|\s*[^\n|]*\|\s*제품\s*API\s*\|/i,
  /\|\s*[^\n|]*\|\s*리뷰\s*API\s*\|/i,
  /\|\s*[^\n|]*\|\s*Review API\s*\|/i,
  /\|\s*[^\n|]*\|\s*판매\s*API\s*\|/i,
  /\|\s*[^\n|]*\|\s*Sales API\s*\|/i,
  /판매자\s*API\s*(메타)?데이터/i,
  /seller\s*API\s*(meta)?data/i,
  /structured\s+seller\s*API/i,
  /글로벌\s*셀러\s*API/i,
];

/** Reject formulaic TOP-5 titles; encourage varied human headlines. */
export const FORMULAIC_TITLE_PATTERNS = [
  /^20\d{2}년\s+가성비\s+.+\s+TOP\s*5/i,
  /^20\d{2}\s+Best\s+Budget\s+.+\s+TOP\s*5/i,
  /^20\d{2}년\s+.+\s+TOP\s*5\s+—/i,
  /^Best\s+Budget\s+.+\s+TOP\s*5\s+—/i,
];

export const TITLE_STYLE_GUIDE = `
Title rules (buying-guide):
- Do NOT reuse "2026 가성비 X TOP 5 — …" on every post.
- Rotate formats: question, myth-bust, scenario, number hook, comparison angle.
- Include 1–2 real search keywords naturally (e.g. 보조배터리, 무선 이어폰).
- Match body promise; no empty clickbait.
- EN and KO titles should feel independently written, not literal translations of the same template.
`.trim();

/** Professional review formats — see docs/templates/ */
export const REVIEW_FORMAT_GUIDE = `
Content profiles (contentProfile frontmatter):
- buying-guide: docs/templates/buying-guide.md
- head-to-head: docs/templates/head-to-head.md
- scenario-guide: docs/templates/scenario-guide.md
- explainer: docs/templates/explainer.md
- checklist: docs/templates/checklist.md
- model-deep-dive: docs/templates/model-deep-dive.md (single popular model review — pipeline assigns focus SKU)
- editorial: docs/templates/editorial.md (admin/internal only — not in auto replenish)

Auto rotation: equal round-robin shuffle deck (each public profile once per cycle).
Required across public profiles: Related guides, FAQ, a skip/risk or comparison table — not a cloned methodology H2.
Methodology lives on /about. Vary H2 order within a profile so posts do not share one spine.
Season-first topic selection: scripts/lib/season-topics.mjs
`.trim();

export const METHODOLOGY_BLOCK_KO = `분석 방법론은 본문이 아니라 /about 에 있습니다. 제조사 공개 스펙·공식 판매가·공개 리뷰만 교차 검증하고, 자체 판매 API나 비공개 셀러 DB는 쓰지 않습니다. 기사에 "## 분석 방법론" 상투 블록을 넣지 마세요.`;

export const METHODOLOGY_BLOCK_EN = `Methodology lives on /about, not in the article body. Cross-check public manufacturer specs, listed retail prices, and open reviews. Do not use proprietary seller APIs. Do not emit an "## Analysis methodology" stump.`;
