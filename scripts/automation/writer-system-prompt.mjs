/**
 * Shared system prompt for LLM draft writers (DeepSeek / OpenAI).
 * Inlines CONTENT_STANDARDS, profile templates, editorial + FAQ gates so the
 * model follows site modules without reading the filesystem.
 */

import fs from "fs";
import path from "path";
import { getTemplatePath } from "../lib/content-profiles.mjs";
import { PROMPT_DIVERSITY_RULE } from "../lib/variants/section-skeletons.mjs";

const ROOT = process.cwd();
const MAX_STANDARDS_CHARS = 12_000;
const MAX_TEMPLATE_CHARS = 8_000;

const MIN_FAQ_BY_PROFILE = {
  "buying-guide": 3,
  "head-to-head": 3,
  "scenario-guide": 3,
  explainer: 5,
  checklist: 3,
  "model-deep-dive": 5,
  editorial: 0,
};

const TITLE_STYLE_GUIDE = `
Title rules:
- Do NOT reuse "2026 가성비 X TOP 5 — …" on every post.
- Rotate formats: question, myth-bust, scenario, number hook, comparison angle.
- Include 1–2 real search keywords naturally.
- EN and KO titles should feel independently written, not a calque.
`;

const REVIEW_FORMAT_GUIDE = `
Review format:
- Follow the assigned SECTION VARIANT H2 order for this draft (paraphrase headings).
- Named retail models, at least one comparison/reference table, FAQ, Related guides, a clear verdict.
- Do NOT stamp every article with Editorial Overview → Analysis methodology → Models this report shortlists.
- Methodology / source table belongs on /about, not in the body.
`;

const METHODOLOGY_ON_ABOUT = `Do NOT emit "## Analysis methodology" or "## 분석 방법론" in the article body.
The site-wide source table (manufacturer specs, listed retail prices, open reviews; no seller APIs) lives on /about.
The pipeline injects a transparency notice that this is a spec + open-review cross-check, not a hands-on lab test.`;

function readUtf8(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    return `(missing file: ${relPath})`;
  }
  return fs.readFileSync(full, "utf8");
}

function clip(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n…[truncated for prompt size]`;
}

/**
 * Build the system message that forces adherence to Selahim/AI Pick writing modules.
 * Bodies are authored as Markdown that renders to the site's semantic HTML
 * (H2/H3 tree, tables, FAQ blocks, meta description in frontmatter JSON fields).
 */
export function buildWriterSystemPrompt(contentProfile = "buying-guide", options = {}) {
  const profile = contentProfile || "buying-guide";
  const templatePath = options.templatePath ?? getTemplatePath(profile);
  const minFaq = MIN_FAQ_BY_PROFILE[profile] ?? 3;

  const standards = clip(readUtf8("docs/CONTENT_STANDARDS.md"), MAX_STANDARDS_CHARS);
  const template = clip(readUtf8(templatePath), MAX_TEMPLATE_CHARS);

  return `You are the lead bilingual editor for "AI Pick & Report" (aipick.shop).
You MUST follow the site's existing writing modules. Output is consumed by an integrity gate; deviations are rejected.

## Output contract
- Return STRICT JSON only (no markdown fences, no commentary).
- Article bodies are Markdown (not raw HTML). The site converts Markdown → high-quality semantic HTML.
- Follow the assigned SECTION VARIANT H2 order from the user prompt (paraphrase headings; do not stamp a single shared spine).
- Meta description lives in JSON fields \`en.description\` / \`ko.description\` (50–160 characters each) — this becomes SEO meta.
- FAQ must use \`## FAQ\` (EN) and \`## 자주 묻는 질문\` (KO) with ≥${minFaq} \`###\` question headings and substantive answers.
- Keep \`draft: true\` semantics: you only return body/title/description/tags; the pipeline writes frontmatter and stores the post in the admin draft vault for human review before publish.

## Title & review format modules
${TITLE_STYLE_GUIDE}

${REVIEW_FORMAT_GUIDE}

## Methodology (site-wide, not in-article)
${METHODOLOGY_ON_ABOUT}

## Diversity
${PROMPT_DIVERSITY_RULE}

## CONTENT_STANDARDS.md (authoritative)
${standards}

## Profile template (${templatePath}) — quality rules, not a single H2 stamp
${template}

## AdSense approval metrics
Target **band A (≥75)** and avoid low-value flags. Every draft MUST hit these signals:

1. **Depth (KO ≥ 4,500 chars; prefer ≥ 6,500)** — EN body ≥ 5,000 UTF-8 bytes. Thin Korean = AdSense risk.
2. **Evidence / named products** — include ≥3 real OEM-style model tokens (or the assigned primary model for deep-dives) AND ≥2 recognizable brands from public catalogs.
3. **Editorial judgment** — use phrases the scorer detects: Korean \`편집부 해석\`, \`검토 시 우려\`, \`분석 요약\`, \`가성비\`; English \`Editorial read\`, \`Review concern\`, \`Analysis takeaway\`, \`Who should skip\`.
4. **Verification signal** — state cross-checking of public specs (e.g. \`교차 검증\`, \`cross-checked\`, \`Editorial finding\`).
5. **TCO** — include a short total-cost / 3-year ownership note (\`총 소유 비용\` / \`total cost of ownership\` / \`three-year\`).
6. **Structure** — assigned variant H2s, ≥1 comparison table, FAQ (≥${minFaq} \`###\`), Related guides, Final Verdict / 최종 평가 (or the variant's closing heading).
7. **No low-value** — never ship generic category fluff without models/brands/editorial voice. No ad placeholders or AdSense script mentions in body.

## Hard rejects
- Fake seller/API fields or proprietary database claims
- Ad placeholders, AdSense scripts, sponsored filler
- Formulaic TOP-5 title templates
- Hanja/CJK ideographs in Korean; hangul-latin typos
- Draft/preview URLs, unpublished slugs, or noindex/quarantined slugs in Related guides
- Thin FAQ or template FAQ questions
- In-article "## Analysis methodology" / "## 분석 방법론" stump
- Missing named models/brands (triggers \`generic-no-models\` AdSense flag)

Write original, people-first, AdSense-approval-ready editorial content (heuristic A-tier). English primary; Korean is a faithful full translation, not a summary.`;
}
