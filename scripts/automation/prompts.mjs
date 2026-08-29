import { getTemplatePath } from "../lib/content-profiles.mjs";
import { getCurrentSeason, getActiveSeasonalEvents } from "../lib/season-topics.mjs";
import { listPublishedSlugs } from "../lib/content-quality.mjs";
import { modelSlugToken } from "../lib/popular-model-picks.mjs";
import {
  formatSkeletonForPrompt,
  PROMPT_DIVERSITY_RULE,
} from "../lib/variants/section-skeletons.mjs";

export function buildGenerationPrompt(topic, year, contentProfile = "buying-guide", options = {}) {
  const templatePath = getTemplatePath(contentProfile);
  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents()
    .map((e) => e.label)
    .join(", ");

  const { writingMode = "stable", toneVariant, benchmarkOutline, modelPick, skeleton } =
    options;

  const modelPickSection =
    contentProfile === "model-deep-dive" && modelPick?.primary
      ? `
FOCUS MODEL (mandatory — entire article is a deep-dive review of this product):
- Primary: ${modelPick.primary.brand} ${modelPick.primary.name} (${modelPick.primary.nameKo})
- Catalog ID: ${modelPick.primary.id}
- Why now: ${modelPick.primary.why ?? "popular or latest retail pick in this category"}
${modelPick.rival ? `- One short rival comparison only: ${modelPick.rival.brand} ${modelPick.rival.name} (${modelPick.rival.nameKo})` : ""}
- Title MUST include "${modelPick.primary.brand} ${modelPick.primary.name}" (or accepted shorthand).
- Suggested slug: ${year}-${topic.id}-${modelSlugToken(modelPick.primary)}-review
- NOT a category roundup — center every H2 on the primary model's real-world use, specs, and verdict.
`
      : "";

  const benchmarkSection =
    writingMode === "benchmark" && benchmarkOutline
      ? `\nBENCHMARK OUTLINE (outline-first — paraphrase all headings, never copy SERP text):\n` +
        benchmarkOutline.sections
          .map((s) => {
            const h3 = (s.h3 ?? []).map((h) => `### ${h}`).join("\n");
            return `## ${s.h2}${h3 ? `\n${h3}` : ""}`;
          })
          .join("\n") +
        `\nTone variant: ${toneVariant ?? benchmarkOutline.toneVariant ?? "editorial"}\n`
      : "";

  const skeletonSection = skeleton
    ? `\n${formatSkeletonForPrompt(skeleton)}\n${PROMPT_DIVERSITY_RULE}\n`
    : "";

  return `You are the lead editor of "AI Pick & Report", a data-driven IT review site (smartphones, gadgets, consumer electronics, home appliances).

Write ONE original article about: ${topic.angle}
Category: ${topic.category}
Content profile: ${contentProfile}
Writing mode: ${writingMode}
Template: ${templatePath}
Year context: ${year}
Season priority (KST): ${season}${events ? ` — active events: ${events}` : ""}
${benchmarkSection}${modelPickSection}${skeletonSection}

MANDATORY RULES (violations = rejection):
1. Google Content Guidelines: original, helpful, people-first. No copied manufacturer marketing copy. Verifiable specs with clear methodology. No clickbait. Title must match body.
2. AdSense-safe: NO ad placeholders, NO "sponsored" blocks, NO AdSense/script mentions, NO affiliate-heavy CTAs. Pure informational editorial tone.
3. Policy: NO guaranteed Google rankings, clickbait, fake urgency, or misleading seller/API claims. See scripts/lib/content-policy.mjs.
4. SEO: unique title & description (description 50-160 chars — this is the meta description), semantic ##/### heading tree, comparison tables where useful, natural keywords only. Meet minimum body length for profile. No keyword stuffing. Bodies are Markdown that render to the site's semantic HTML (do not emit raw HTML tags). Rotate H2 order versus other posts on this site — the template is a required-block checklist, not a cloned spine.
5. Titles: do NOT reuse "2026 가성비 X TOP 5 — …" or "Best Budget X TOP 5 — …" templates. Rotate formats (question, scenario, myth-bust, number hook). EN and KO titles should feel independently written.
6. Methodology: do NOT claim proprietary seller APIs, sale_price_usd fields, or private databases. Use honest editorial sources (manufacturer specs, listed retail prices, public reviews). Do NOT include "## Analysis methodology" / "## 분석 방법론" in the body — that table lives on /about.
7. Follow the profile template at ${templatePath} as a checklist of required blocks, not a fixed H2 order. Always include Related guides internal links to **published** posts only (/en/blog/slug or /ko/blog/slug — no deleted or draft slugs). English primary, Korean faithful translation (not a summary).
   Example published slugs you may link (pick 3–5 relevant): ${[...listPublishedSlugs(process.cwd())].sort().slice(0, 20).join(", ")}.
8. Season framing: tie the angle to current season (${season}) when the topic is seasonal (AC in summer, etc.). **Evergreen tech** (smartphones, laptops, earbuds, monitors): focus on named 2025–2026 models and specs — do NOT force a summer-heat narrative.
9. **Model depth**: for \`head-to-head\` or \`flagship-smartphones\` / \`budget-smartphones\` / \`laptops\`: name **2–3 specific current retail models** (generation + SKU-style token for the writing year — e.g. in mid-2026: Galaxy S26 Ultra, iPhone 17 Pro, Pixel 10 Pro) in H2 sections — not generic "Model A/B" and not two-cycles-old phones labeled as "current / 현세대". Each model section needs strengths, weaknesses, and a scenario verdict.
9b. **Model deep-dive** (\`model-deep-dive\`): when FOCUS MODEL block is present, the article is a single-product editorial review — spec sheet, strengths/weaknesses, who should buy/skip, one rival section max, Final Verdict with buy/wait/skip. Do **not** invent body image markdown URLs — the pipeline injects 1–2 figures with ALT (prefer manufacturer Press Kit / Media Gallery when curated; else copyright-safe stock).
10. Bilingual depth: EN body ≥ 5,000 UTF-8 bytes; KO body ≥ 2,500 characters. Checklist items need 2–3 sentences each for Why and Red flag in both languages.
11. Publish integrity gate (auto-checked before draft save & LIVE): no calendar year (20xx) in titles; EN titles must not start with How to / Stop / Why you / What to / When to; no hangul-latin typos in Korean (e.g. 백그ra운드); no Hanja/CJK ideographs in Korean (use Hangul only — e.g. 과대 not 誇大, 독창적 not 독찴적); ≥3 Related guides links to published slugs only; ≥3 tags; ≥4 H2 sections (head-to-head ≥3); locale-correct internal links (/en/ in en.md, /ko/ in ko.md); no duplicate H2 headings; no draft/preview URLs in body.
12. FAQ: include ## FAQ / ## 자주 묻는 질문 with 3–5 pairs. Questions = beginner-curious (natural Korean/English), NOT templates like "어떤 사용자에게 가장 잘 맞나요" or "체크리스트의 ○○은 왜 구매 전에". Answers = warm editorial team voice, 4–6 sentences, easy examples.
13. Quality (AdSense review): KO ≥4500 chars (prefer 6500+); name ≥3 current retail models and ≥2 brands when the topic is a product roundup; mention 3-year total cost of ownership where it changes the bill. Do NOT stamp identical H2 labels such as "Models this report shortlists" or canned phrases (Editorial read / Review concern / Analysis takeaway) on every post — paraphrase. Skip/risk or comparison table + FAQ with H3 questions still required. No ad slots.

${topic.liveData ? `Use these placeholders in body where prices/dates appear:
- {{today}} or {{today_locale}} for dates
- {{usd_krw_rate}} for exchange rate mention
- {{krw:29.99}} to convert USD prices (example)
Set liveData true in output.` : "Do not use live data placeholders."}

The pipeline may request EN and KO in separate passes. When asked for both locales, return ONLY valid JSON (no markdown fences):
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
