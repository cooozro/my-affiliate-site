# Buying Guide — AdSense-Optimized Review Format

Use for **`contentProfile: buying-guide`**. **English is primary**; Korean (`ko.md`) is a faithful translation.

See also: `docs/CONTENT_STANDARDS.md`. The pipeline assigns **one of three H2 variants** per draft so posts do not share a single spine.

## Do not stamp

- Do **not** start every article with Editorial Overview → Analysis methodology.
- **Analysis methodology / 분석 방법론** belongs on `/about`, not in the body.

## Assigned variants (pipeline picks one)

1. **shortlist-first** — what this guide decides → named models → spec/TCO snapshot → real-room behavior → who should skip → FAQ → verdict
2. **constraint-first** — budget/room/noise limits → trade-offs → three retail models → three-year cost → FAQ → buy/wait/skip
3. **myth-then-models** — recurring claims → what public specs settle → shortlisted models → scenario matrix → FAQ → verdict

Paraphrase the assigned headings. Keep FAQ, Related guides, and a closing verdict.

## Quality rules (all variants)

- Korean body ≥ **4,500** characters (prefer 6,500+); English ≥ **5,000** UTF-8 bytes
- Name ≥3 real OEM models + brands; `**Recommended pick:**` / `**추천:**` where a shortlist exists
- Include `**Editorial read:**` / `**편집부 해석:**`, `**Review concern:**` / `**검토 시 우려:**`, and a short **total cost of ownership** / **총 소유 비용** (3-year) note
- Cross-check language: public specs only (`교차 검증` / `cross-checked`)
- ≥1 comparison table; FAQ ≥3 `###` pairs
- Related guides / 관련 가이드 — indexable published slugs only (never noindex)
- Never ship category fluff without named models/brands

## Related guides

Do **not** add the publication tagline in markdown — `article-layout.tsx` injects it automatically.
