import { getTemplatePath } from "../lib/content-profiles.mjs";
import { getCurrentSeason, getActiveSeasonalEvents } from "../lib/season-topics.mjs";

export function buildGenerationPrompt(topic, year, contentProfile = "buying-guide") {
  const templatePath = getTemplatePath(contentProfile);
  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents()
    .map((e) => e.label)
    .join(", ");

  return `You are the lead editor of "AI Pick & Report", a data-driven IT review site (smartphones, gadgets, consumer electronics, home appliances).

Write ONE original article about: ${topic.angle}
Category: ${topic.category}
Content profile: ${contentProfile}
Template: ${templatePath}
Year context: ${year}
Season priority (KST): ${season}${events ? ` — active events: ${events}` : ""}

MANDATORY RULES (violations = rejection):
1. Google Content Guidelines: original, helpful, people-first. No copied manufacturer marketing copy. Verifiable specs with clear methodology. No clickbait. Title must match body.
2. AdSense-safe: NO ad placeholders, NO "sponsored" blocks, NO AdSense/script mentions, NO affiliate-heavy CTAs. Pure informational editorial tone.
3. SEO: unique title & description (description 50-160 chars), semantic ##/### headings, comparison tables where useful, natural keywords only. Meet minimum body length for profile. No keyword stuffing.
4. Titles: do NOT reuse "2026 가성비 X TOP 5 — …" or "Best Budget X TOP 5 — …" templates. Rotate formats (question, scenario, myth-bust, number hook). EN and KO titles should feel independently written.
5. Methodology: do NOT claim proprietary seller APIs, sale_price_usd fields, or private databases. Use honest editorial sources (manufacturer specs, listed retail prices, public reviews). Include a "## Analysis methodology" / "## 분석 방법론" section with a plain-language source table.
6. Follow the profile template at ${templatePath}. Always include Editorial Overview, methodology, Related guides internal links to **published** posts only (/en/blog/slug or /ko/blog/slug — no deleted or draft slugs). English primary, Korean faithful translation (not a summary).
7. Season-first framing: tie the angle to current season (${season}) when the topic is seasonal (AC in summer, air purifier in spring, back-to-school in fall, etc.).
8. Bilingual depth: EN body ≥ 5,000 UTF-8 bytes; KO body ≥ 2,500 characters. Checklist items need 2–3 sentences each for Why and Red flag in both languages.
9. Publish integrity gate (auto-checked before draft save & LIVE): no calendar year (20xx) in titles; EN titles must not start with How to / Stop / Why you / What to / When to; no hangul-latin typos in Korean (e.g. 백그ra운드); ≥3 Related guides links to published slugs only; ≥3 tags; ≥4 H2 sections (head-to-head ≥3); locale-correct internal links (/en/ in en.md, /ko/ in ko.md); no duplicate H2 headings; no draft/preview URLs in body.

${topic.liveData ? `Use these placeholders in body where prices/dates appear:
- {{today}} or {{today_locale}} for dates
- {{usd_krw_rate}} for exchange rate mention
- {{krw:29.99}} to convert USD prices (example)
Set liveData true in output.` : "Do not use live data placeholders."}

Return ONLY valid JSON (no markdown fences):
{
  "slug": "lowercase-hyphenated-english-slug-with-year",
  "topicId": "${topic.id}",
  "topicCluster": "${topic.topicCluster ?? topic.category ?? ""}",
  "contentProfile": "${contentProfile}",
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
