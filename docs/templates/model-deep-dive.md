# Model Deep-Dive Format

Use for **`contentProfile: model-deep-dive`**. One **named retail model** per article — specs, real-world use, strengths/weaknesses, who should buy.

## Search intent

"Galaxy S25 review", "Dyson V15 vs worth it", "MacBook Air M3 long-term" — readers researching a **specific popular model**.

## Section order

1. **Editorial Overview** / **편집부 개요**
2. **Introduction** — why this model matters now (launch wave, price drop, or category leader)
3. **Analysis methodology** / **분석 방법론**
4. **At-a-glance spec sheet** / **한눈에 보는 스펙** — table (MSRP band, key specs, release window)
5. **## Design & everyday use** / **## 디자인과 실사용** — pipeline inserts a **product figure** here (ALT + credit)
6. **## Core performance** / **## 핵심 성능** — category-specific; optional 2nd lifestyle/detail figure
7. **## Strengths & weaknesses** / **## 장점과 아쉬운 점** — honest bullets
8. **## Who should buy / Who should skip** / **## 이런 분에게 추천 / 이런 분은 패스**
9. **## How it compares to [rival]** — one rival model only (short, not full head-to-head)
10. **## FAQ** / **## 자주 묻는 질문** — ≥5 `###` Q&A tied to **this model**
11. **Related guides** / **관련 가이드**
12. **Final Verdict** / **최종 평가** — clear buy/wait/skip recommendation

## Visuals (mandatory for this profile)

**Priority 1 — Official Press Kit / Media Gallery** (preferred for named models)

- Pipeline **auto-discovers** manufacturer press images (Serper → allowlisted newsroom hosts: Samsung Mobile Press / Newsroom CDN, Apple Newsroom, LG, Sony, …).
- Only allowlisted hosts are downloaded — never scrape retail storefronts.
- Credit: “Official press image courtesy of {Brand} (Press Kit / Media Gallery)”.
- Frontmatter may include `pressKitGallery` linking to the public media page.

**Priority 2 — Stock fallback** (Pexels/Pixabay)

- When no press-kit direct URL is curated yet, use category product-cut stock with ALT naming the focus model.
- Credit discloses stock source.

**Body**: pipeline adds **1–2 figures** with descriptive **ALT** (EN+KO) and credit captions — reduces visual fatigue between long text blocks.

Do not invent image URLs in LLM output — the automation module injects paths under `/images/posts/{slug}/`.

## Rules

- Title MUST include the **primary model name** (EN + KO titles).
- Body centers on the **pipeline-assigned primary model** — not a generic category roundup.
- Include **≥1 spec table** and **Editorial read** / **편집부 해석** block.
- Mention **total cost of ownership** (filters, accessories, subscription) where relevant.
- English primary; Korean faithful translation.
