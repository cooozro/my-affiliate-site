/**
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

/** Professional review format (AdSense E-E-A-T) — see docs/BUYING_GUIDE_TEMPLATE.md */
export const REVIEW_FORMAT_GUIDE = `
Required body structure (buying-guide):
1. First ## heading: "Editor's Note" (EN) or "에디터 노트" (KO) — 2-3 sentences, first-person operator insight.
2. Each product ## section: Strengths, Weaknesses, Practical insight ("For the average user, this translates to…" / "일반 사용자 입장에서는…"), Verdict.
3. End with "## Final Verdict" / "## 최종 평가" including "### Who should buy?" and "### Who should skip?" tables (or KO: 이런 분께 추천 / 이런 분은 패스).
4. Tone: informative, trustworthy, helpful — natural value-for-money context, not hype.
`.trim();

export const METHODOLOGY_BLOCK_KO = `## 분석 방법론

본 비교는 **제조사 공개 스펙·공식 판매가·공개 리뷰**를 교차 검증한 편집부 분석입니다. 자체 판매 API나 비공개 셀러 데이터베이스를 사용하지 않으며, 독자가 직접 확인할 수 있는 출처만 포함합니다.

| 항목 | 수집 출처 | 활용 목적 |
| --- | --- | --- |
| 판매가 | 제조사·공식몰·주요 쇼핑몰 공시 가격 | 참고가 비교 |
| 제품 스펙 | 제조사 스펙시트·인증 문서 | 정량 스펙 비교 |
| 사용자 평점 | 공개 리뷰 플랫폼 평균 | 품질 신뢰도 참고 |
| 시장 관심도 | 검색·리뷰 작성량 추이 | 수요 참고 |
| 품질 리스크 | 공개 후기·불량 언급 비율 | 상대적 리스크 참고 |`;

export const METHODOLOGY_BLOCK_EN = `## Analysis methodology

This comparison is **editorial research** cross-checking public manufacturer specs, listed retail prices, and open reviews. We do **not** use proprietary seller APIs or private seller databases.

| Item | Source | Purpose |
| --- | --- | --- |
| Retail price | OEM sites and major storefronts | Reference price comparison |
| Product specs | Manufacturer spec sheets | Quantitative comparison |
| User rating | Public review platform averages | Quality signal |
| Market interest | Search and review volume trends | Demand context |
| Quality risk | Defect mentions in public reviews | Relative risk signal |`;
