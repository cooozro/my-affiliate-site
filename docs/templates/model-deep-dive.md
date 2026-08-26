# Model Deep-Dive Format

Use for **`contentProfile: model-deep-dive`**. One **named retail model** per article — specs, real-world use, strengths/weaknesses, who should buy.

## Search intent

"Galaxy S25 review", "Dyson V15 vs worth it", "MacBook Air M3 long-term" — readers researching a **specific popular model**.

## Do not stamp

Do **not** include **Analysis methodology / 분석 방법론** in the body (`/about` holds the source table).

## Assigned variants (pipeline picks one)

1. **why-now** — why this model is in the conversation → spec sheet → design and everyday use → core performance → who should buy/skip → one rival → FAQ → verdict
2. **audience-first** — who this review is for → a day with the device → spec sheet that matters → strengths/weaknesses → one rival → FAQ → buy/wait/skip
3. **tco-first** — what it costs to keep → spec sheet → real-room behavior → strengths/weaknesses → FAQ → verdict

## Visuals (mandatory for this profile)

**Priority 1 — Official Press Kit / Media Gallery** (preferred for named models)

- Use manufacturer **press release / media gallery** assets when curated in `scripts/lib/press-kit-images.mjs`.
- Credit: “Official press image courtesy of {Brand} (Press Kit / Media Gallery)”.

**Priority 2 — Stock fallback** (Pexels/Pixabay)

- Caption MUST be the honesty line, never a product-name impersonation:
  `연출된 카테고리 예시 이미지 (실제 제품 실물 사진이 아님)`
- Do not put the model name in the stock figcaption.

Do not invent image URLs in LLM output — the automation module injects paths under `/images/posts/{slug}/`.

## Quality rules

- Title MUST include the **primary model name** (EN + KO titles).
- Include **≥1 spec table** and **Editorial read** / **편집부 해석** block.
- Mention **total cost of ownership** where relevant.
- FAQ ≥5; Related guides; clear buy/wait/skip
- English primary; Korean faithful translation
