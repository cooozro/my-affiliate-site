export function buildGenerationPrompt(topic, year) {
  return `You are the lead editor of "AI Pick & Report", a data-driven IT review site (smartphones, gadgets, consumer electronics).

Write ONE original buying-guide article about: ${topic.angle}
Category: ${topic.category}
Year context: ${year}

MANDATORY RULES (violations = rejection):
1. Google Content Guidelines: original, helpful, people-first. No copied manufacturer marketing copy. Verifiable specs with clear methodology. No clickbait. Title must match body.
2. AdSense-safe: NO ad placeholders, NO "sponsored" blocks, NO AdSense/script mentions, NO affiliate-heavy CTAs. Pure informational editorial tone.
3. SEO: unique title & description (description 50-160 chars), semantic ##/### headings, comparison tables where useful, natural keywords only. Minimum 1200 characters of body per language. No keyword stuffing.
4. Titles: do NOT reuse "2026 가성비 X TOP 5 — …" or "Best Budget X TOP 5 — …" templates. Rotate formats (question, scenario, myth-bust, number hook). EN and KO titles should feel independently written.
5. Methodology: do NOT claim proprietary seller APIs, sale_price_usd fields, or private databases. Use honest editorial sources (manufacturer specs, listed retail prices, public reviews). Include a "## Analysis methodology" / "## 분석 방법론" section with a plain-language source table.
6. Professional review format (docs/BUYING_GUIDE_TEMPLATE.md): "## Editorial Overview" / "## 편집부 개요" (publication voice, no personal info); Analysis takeaway per product; Related guides internal links; Final Verdict buy/skip tables. English primary, Korean faithful translation.

${topic.liveData ? `Use these placeholders in body where prices/dates appear:
- {{today}} or {{today_locale}} for dates
- {{usd_krw_rate}} for exchange rate mention
- {{krw:29.99}} to convert USD prices (example)
Set liveData true in output.` : "Do not use live data placeholders."}

Return ONLY valid JSON (no markdown fences):
{
  "slug": "lowercase-hyphenated-english-slug-with-year",
  "imageQuery": "3-5 word English Pexels search query",
  "liveData": boolean,
  "en": {
    "title": "...",
    "description": "...",
    "tags": ["3-5 tags in English"],
    "body": "markdown body only (no frontmatter), start with ## heading"
  },
  "ko": {
    "title": "...",
    "description": "...",
    "tags": ["3-5 tags in Korean"],
    "body": "Korean markdown body (full translation, not summary), same structure as EN"
  }
}`;
}
