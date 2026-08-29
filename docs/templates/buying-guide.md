# Buying Guide — AdSense-Optimized Review Format

Use for **`contentProfile: buying-guide`**. **English is primary**; Korean (`ko.md`) is a faithful translation.

See also: `docs/CONTENT_STANDARDS.md`, `scripts/lib/editorial-standards.mjs`.

## Section order

1. **Editorial Overview** / **편집부 개요** (optional — do not clone the same opener on every post)
2. **Introduction** / **서론**
3. Do **not** include **Analysis methodology / 분석 방법론** in the body (`/about` holds the source table).
4. **Models this report shortlists** / **편집부가 선정한 대표 모델** — name ≥3 real OEM models + brands; use `**Recommended pick:**` / `**추천:**`
5. **TOP 5 comparison table**
6. **Product sections** (`## 1. Model name`)
7. **Scenario matrix**
8. **FAQ** / **자주 묻는 질문** — ≥3 `###` Q&A pairs (buying-specific; not template filler)
9. **Related guides** / **관련 가이드**
10. **Five checks before you buy** (numbered list, ≥3 items)
11. **Final Verdict** / **최종 평가** — Who should buy / Who should skip tables

## AdSense depth (mandatory)

- Korean body ≥ **4,500** characters (prefer 6,500+); English ≥ **5,000** UTF-8 bytes
- Include `**Editorial read:**` / `**편집부 해석:**`, `**Review concern:**` / `**검토 시 우려:**`, and a short **total cost of ownership** / **총 소유 비용** (3-year) note
- Cross-check language: public specs only (`교차 검증` / `cross-checked`)
- Never ship category fluff without named models/brands (blocks AdSense A-tier)

## Product section

After Strengths / Weaknesses: `**Analysis takeaway:**` / `**분석 요약:**`

## Related guides

Do **not** add the publication tagline in markdown — `article-layout.tsx` injects it automatically.

## Final Verdict

Two-column tables: Model | Buy if / Skip if.

Korean: `## 최종 평가`, `### 이런 분께 추천`, `### 이런 분은 패스`
