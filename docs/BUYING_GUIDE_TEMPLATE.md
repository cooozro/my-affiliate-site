# Buying Guide — AdSense-Optimized Review Format

> **Moved:** Full template is now at [`docs/templates/buying-guide.md`](templates/buying-guide.md).  
> Other formats: `head-to-head`, `scenario-guide`, `explainer`, `checklist` — see `docs/templates/`.

Use for every **buying-guide** post (`contentProfile: buying-guide`). **English is the primary editorial language**; Korean (`ko.md`) should be a faithful translation of the English body.

## AdSense pre-approval rules

- **No ad code** in posts: no `<!-- ad-break -->`, AdSense scripts, or ad placeholders.
- **No personal operator details**: no first-person career notes, employer names, or “I wrote this because…” framing.
- **Publication voice only**: third-person editorial (“As an independent tech review publication, we analyze…”).

## Section order

1. **Editorial Overview** / **편집부 개요** — first `##` in body
2. **Introduction** / **서론**
3. **Analysis methodology** / **분석 방법론**
4. **TOP 5 comparison table**
5. **Product sections** (`## 1. Model name`)
6. **Scenario matrix**
7. **Related guides** / **관련 가이드** — internal links to other categories on this site
8. **Five checks before you buy** (numbered list, ≥3 items)
9. **Final Verdict** / **최종 평가** — Who should buy / Who should skip tables

---

## Editorial Overview (required)

2–3 sentences. **Independent publication voice** — why this category was analyzed and one data-driven observation. No personal biography.

**EN example:**

```markdown
## Editorial Overview

> As an independent tech review publication, we cross-check public manufacturer specs and listed retail prices for portable power banks. In our analysis, **watt-hours (Wh) and USB-C PD output** predict airline compliance and real-world charge speed more reliably than mAh labels alone.
```

**KO example (translate from EN, not a separate angle):**

```markdown
## 편집부 개요

> AI Pick & Report는 독립 기술 리뷰 매체로서 보조배터리 비교 시 제조사 공개 스펙과 공식 판매가를 교차 검증합니다. 분석 결과 **Wh(와트시)와 PD 와트**가 mAh 표기보다 항공기 휴대 적합성과 실제 충전 속도를 더 정확히 반영합니다.
```

---

## Product section (each H2)

After **Strengths** / **Weaknesses**, add one analytical line (no personal voice):

| EN | KO |
| --- | --- |
| `**Analysis takeaway:** For most buyers, this translates to…` | `**분석 요약:** 일반적인 사용 환경에서는…` |

---

## Related guides (required when relevant)

Link to other published guides using locale paths: `/en/blog/{slug}` or `/ko/blog/{slug}`.

**Do not add the publication tagline in markdown.** `article-layout.tsx` injects it automatically directly under `## Related guides` / `## 관련 가이드`, above the bullet list.

```markdown
## Related guides

- [Sub-$300 smartphones](/en/blog/2026-budget-smartphones-under-300) — match PD output to your phone's fast-charge rating
- [Budget wireless earbuds](/en/blog/2026-budget-wireless-earbuds-top5) — portable audio gear that shares the same travel bag
```

---

## Final Verdict (required)

Use **two-column tables** (Model | Buy if / Skip if). Tables scroll horizontally on mobile via site CSS—keep rows concise.

```markdown
## Final Verdict

[1–2 sentences: category takeaway in neutral editorial tone]

### Who should buy?

| Model | Buy if you… |
| --- | --- |
| **Model A** | … |

### Who should skip?

| Model | Skip if you… |
| --- | --- |
| **Model C** | … |
```

Korean: `## 최종 평가`, `### 이런 분께 추천`, `### 이런 분은 패스`

---

## Tone (English-first)

- Write **EN** as a natural US/UK tech review publication.
- **KO** mirrors EN structure and claims; avoid Korea-only angles unless the EN version includes them.
- Informative, trustworthy, helpful — no hype, no affiliate CTAs.

---

## Checklist

- [ ] No ad placeholders or scripts in body
- [ ] `## Editorial Overview` / `## 편집부 개요` (publication voice, no personal info)
- [ ] `**Analysis takeaway:**` / `**분석 요약:**` in every product section
- [ ] `## Related guides` with internal links where relevant
- [ ] `## Final Verdict` with buy/skip tables
- [ ] `npm run content:validate`
