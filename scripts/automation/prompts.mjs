import { getTemplatePath } from "../lib/content-profiles.mjs";
import { getCurrentSeason, getActiveSeasonalEvents } from "../lib/season-topics.mjs";
import { modelSlugToken } from "../lib/popular-model-picks.mjs";
import {
  formatSkeletonForPrompt,
  pickSectionSkeleton,
  PROMPT_DIVERSITY_RULE,
} from "../lib/variants/section-skeletons.mjs";
import { listCorpusPosts } from "../lib/topic-coverage.mjs";

function listOccupiedHint(root) {
  try {
    return listCorpusPosts(root)
      .map((post) => {
        const flags = [
          post.draft ? "draft" : "live",
          post.noindex ? "noindex" : null,
        ]
          .filter(Boolean)
          .join("+");
        return `${post.slug} [${flags} topic=${post.topicId} profile=${post.profile}]`;
      })
      .sort()
      .slice(0, 40)
      .join("; ");
  } catch {
    return "";
  }
}

function listIndexableSlugsHint(root) {
  try {
    return listCorpusPosts(root)
      .filter((post) => !post.draft && !post.noindex)
      .map((post) => post.slug)
      .sort()
      .slice(0, 20)
      .join(", ");
  } catch {
    return "";
  }
}

export function buildGenerationPrompt(topic, year, contentProfile = "buying-guide", options = {}) {
  const templatePath = getTemplatePath(contentProfile);
  const season = getCurrentSeason();
  const events = getActiveSeasonalEvents()
    .map((e) => e.label)
    .join(", ");

  const { writingMode = "stable", toneVariant, benchmarkOutline, modelPick, skeleton } = options;

  const resolvedSkeleton =
    skeleton ?? pickSectionSkeleton(contentProfile, `${topic.id}|${topic.angle}|${contentProfile}`);
  const skeletonSection = formatSkeletonForPrompt(resolvedSkeleton);

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

  const publishedHint = listIndexableSlugsHint(process.cwd());
  const occupiedHint = listOccupiedHint(process.cwd());

  return `You are the lead editor of "AI Pick & Report", a data-driven IT review site (smartphones, gadgets, consumer electronics, home appliances).

Write ONE original article about: ${topic.angle}
Category: ${topic.category}
Content profile: ${contentProfile}
Writing mode: ${writingMode}
Template: ${templatePath}
Year context: ${year}
Season priority (KST): ${season}${events ? ` — active events: ${events}` : ""}
${benchmarkSection}${modelPickSection}
${skeletonSection}

MANDATORY RULES (violations = rejection):
1. Google Content Guidelines: original, helpful, people-first. No copied manufacturer marketing copy. Verifiable specs with honest sourcing. No clickbait. Title must match body.
2. AdSense-safe: NO ad placeholders, NO "sponsored" blocks, NO AdSense/script mentions, NO affiliate-heavy CTAs. Pure informational editorial tone.
3. Policy: NO guaranteed Google rankings, clickbait, fake urgency, or misleading seller/API claims. See scripts/lib/content-policy.mjs.
4. SEO: unique title & description (description 50-160 chars — this is the meta description), semantic ##/### heading tree that follows the SECTION VARIANT above (paraphrase headings), comparison tables where useful, natural keywords only. Meet minimum body length for profile. No keyword stuffing. Bodies are Markdown that render to the site's semantic HTML (do not emit raw HTML tags).
5. Titles: do NOT reuse "2026 가성비 X TOP 5 — …" or "Best Budget X TOP 5 — …" templates. Rotate formats (question, scenario, myth-bust, number hook). EN and KO titles should feel independently written.
6. Methodology: do NOT claim proprietary seller APIs, sale_price_usd fields, or private databases. Use honest editorial sources (manufacturer specs, listed retail prices, public reviews). Do NOT include "## Analysis methodology" / "## 분석 방법론" in the article body — that source table lives on /about. A transparency notice is injected by the pipeline.
7. Follow the assigned SECTION VARIANT, not a one-spine template. Always include Related guides internal links to **indexable published** posts only (/en/blog/slug or /ko/blog/slug — no deleted, draft, or noindex/quarantined slugs). English primary, Korean faithful translation (not a summary).
   Example indexable slugs you may link (pick 3–5 relevant): ${publishedHint || "(resolved at runtime on the live site)"}.
7b. DO NOT rewrite an already-covered topic/keyword. These slugs already exist (draft + live + AdSense noindex all count as occupied): ${occupiedHint || "(resolved at runtime)"}. A noindex post is still a written article — pick a different aisle.
8. Season framing: tie the angle to current season (${season}) when the topic is seasonal (AC in summer, etc.). **Evergreen tech** (smartphones, laptops, earbuds, monitors): focus on named 2025–2026 models and specs — do NOT force a summer-heat narrative.
9. **Model depth**: for \`head-to-head\` or \`flagship-smartphones\` / \`budget-smartphones\` / \`laptops\`: name **2–3 specific current retail models** (generation + SKU-style token for the writing year — e.g. in mid-2026: Galaxy S26 Ultra, iPhone 17 Pro, Pixel 10 Pro) in H2 sections — not generic "Model A/B" and not two-cycles-old phones labeled as "current / 현세대". Each model section needs strengths, weaknesses, and a scenario verdict.
9b. **Model deep-dive** (\`model-deep-dive\`): when FOCUS MODEL block is present, the article is a single-product editorial review — spec sheet, strengths/weaknesses, who should buy/skip, one rival section max, Final Verdict with buy/wait/skip. Do **not** invent body image markdown URLs — the pipeline injects 1–2 figures with ALT (prefer manufacturer Press Kit / Media Gallery when curated; else copyright-safe stock).
10. Bilingual depth: EN body ≥ 5,000 UTF-8 bytes; KO body ≥ 2,500 characters. Checklist items need 2–3 sentences each for Why and Red flag in both languages.
11. Publish integrity gate (auto-checked before draft save & LIVE): no calendar year (20xx) in titles; EN titles must not start with How to / Stop / Why you / What to / When to; no hangul-latin typos in Korean (e.g. 백그ra운드); no Hanja/CJK ideographs in Korean (use Hangul only — e.g. 과대 not 誇大, 독창적 not 독찴적); ≥3 Related guides links to **indexable** published slugs only (never noindex); ≥3 tags; ≥4 H2 sections (head-to-head ≥3); locale-correct internal links (/en/ in en.md, /ko/ in ko.md); no duplicate H2 headings; no draft/preview URLs in body.
12. FAQ: include ## FAQ / ## 자주 묻는 질문 with 3–5 pairs. Questions = beginner-curious (natural Korean/English), NOT templates like "어떤 사용자에게 가장 잘 맞나요" or "체크리스트의 ○○은 왜 구매 전에". Answers = warm editorial team voice, 4–6 sentences, easy examples.
13. AdSense A-tier: KO ≥4500 chars (prefer 6500+); ≥3 named OEM models + ≥2 brands (except single-model deep-dives); use Editorial read/편집부 해석, Review concern/검토 시 우려, Analysis takeaway/분석 요약; mention total cost of ownership / 총 소유 비용 (3-year); avoid generic-no-models.
14. DIVERSITY: ${PROMPT_DIVERSITY_RULE}
15. SHORTLIST TABLES: every row must have a **unique** 근거/Evidence and 메모/Note tied to that model (fast charge, Wh-per-kilo, expandability, pass-through, noise). Never clone one sentence across the table. Match table language to the locale. Never emit HTML comments or \`## 1. 숏리스트 판단 앵커\` / \`## 1. Shortlist decision anchors\`. Write spaced model names (\`DELTA 2 Max\`, not \`EcoFlowD2Max\`).
16. PLACEHOLDERS: if you mention a USD MSRP, convert KRW with \`{{krw:SAME_NUMBER}}\` (and set liveData true). Never hardcode a 원 amount next to a different dollar figure. Do not invent street prices.
17. SCORES: do not invent PSI/SBI or a 점수 column unless the next paragraph lists public-spec weights. Prefer named spec columns (Gbps, Wh, dB). Headings must not say 프로급/플래그십급/pro-grade without a spec token in the same heading.
18. SKIP MATRIX (buying-guide, head-to-head, scenario-guide, model-deep-dive): include Who should skip / 이런 분은 패스 covering ≥2 hidden barriers (local service, ports/cables, weight, bloat/ads, install/power) and a Review concern / 검토 시 우려.

${topic.liveData ? `Use these placeholders in body where prices/dates appear:
- {{today}} or {{today_locale}} for dates
- {{usd_krw_rate}} for exchange rate mention
- {{krw:29.99}} to convert USD prices (example)
Set liveData true in output. Never invent a street price or hard-code a USD/KRW rate.` : "Do not use live data placeholders."}

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
