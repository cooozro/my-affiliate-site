# Buying Guide — AdSense-Optimized Review Format

Use for **`contentProfile: buying-guide`**. **English is primary**; Korean (`ko.md`) is a faithful translation.

See also: `docs/CONTENT_STANDARDS.md`, `scripts/lib/editorial-standards.mjs`.

## Section order

Treat this as a **required-block checklist**. Paraphrase headings and rotate order using the pipeline SECTION VARIANT. Do not clone this numbered spine.

1. A decision-first opener (optional — do not clone the same "Editorial Overview" title)
2. Introduction / 서론
3. Do **not** include **Analysis methodology / 분석 방법론** in the body (`/about` holds the source table).
4. Named-model shortlist — ≥3 real OEM models + brands; Recommended pick / 추천. Paraphrase the H2.
5. Comparison table
6. Product sections (named models)
7. Scenario / skip-risk matrix
8. **FAQ** / **자주 묻는 질문** — ≥3 `###` Q&A pairs (buying-specific; not template filler)
9. **Related guides** / **관련 가이드**
10. Pre-purchase checks (numbered list, ≥3 items)
11. **Final Verdict** / **최종 평가** — Who should buy / Who should skip

## AdSense depth (mandatory)

- Korean body ≥ **4,500** characters (prefer 6,500+); English ≥ **5,000** UTF-8 bytes
- Show editorial judgment, a real concern, and a 3-year total-cost note in natural prose — do not stamp identical `Editorial read` / `편집부 해석` labels on every post
- Cross-check language: public specs only (`교차 검증` / `cross-checked`)
- Never ship category fluff without named models/brands
- No ad slots or AdSense placeholders

## Product section

After Strengths / Weaknesses: `**Analysis takeaway:**` / `**분석 요약:**`

## Related guides

Do **not** add the publication tagline in markdown — `article-layout.tsx` injects it automatically.

## Final Verdict

Two-column tables: Model | Buy if / Skip if.

Korean: `## 최종 평가`, `### 이런 분께 추천`, `### 이런 분은 패스`
