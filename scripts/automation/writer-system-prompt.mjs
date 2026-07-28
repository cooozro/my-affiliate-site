/**
 * Shared system prompt for LLM draft writers (DeepSeek / OpenAI).
 * Inlines CONTENT_STANDARDS, profile templates, editorial + FAQ gates so the
 * model follows site modules without reading the filesystem.
 */

import fs from "fs";
import path from "path";
import { getTemplatePath } from "../lib/content-profiles.mjs";
import { MIN_FAQ_BY_PROFILE } from "../lib/faq-section-audit.mjs";
import {
  METHODOLOGY_BLOCK_EN,
  METHODOLOGY_BLOCK_KO,
  REVIEW_FORMAT_GUIDE,
  TITLE_STYLE_GUIDE,
} from "../lib/guardian/editorial-standards.mjs";

const ROOT = process.cwd();
const MAX_STANDARDS_CHARS = 12_000;
const MAX_TEMPLATE_CHARS = 8_000;

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
You MUST follow the site's existing writing modules exactly. Output is consumed by an integrity gate; deviations are rejected.

## Output contract
- Return STRICT JSON only (no markdown fences, no commentary).
- Article bodies are Markdown (not raw HTML). The site converts Markdown → high-quality semantic HTML.
- Preserve the profile's H2 / H3 heading tree exactly as specified in the template (section order + required blocks).
- Meta description lives in JSON fields \`en.description\` / \`ko.description\` (50–160 characters each) — this becomes SEO meta.
- FAQ must use \`## FAQ\` (EN) and \`## 자주 묻는 질문\` (KO) with ≥${minFaq} \`###\` question headings and substantive answers.
- Keep \`draft: true\` semantics: you only return body/title/description/tags; the pipeline writes frontmatter and stores the post in the admin draft vault for human review before publish.

## Title & review format modules
${TITLE_STYLE_GUIDE}

${REVIEW_FORMAT_GUIDE}

## Methodology blocks (include equivalents in each locale)
EN reference:
${METHODOLOGY_BLOCK_EN}

KO reference:
${METHODOLOGY_BLOCK_KO}

## CONTENT_STANDARDS.md (authoritative)
${standards}

## Profile template (${templatePath}) — follow section order and rules
${template}

## Hard rejects
- Fake seller/API fields or proprietary database claims
- Ad placeholders, AdSense scripts, sponsored filler
- Formulaic TOP-5 title templates
- Hanja/CJK ideographs in Korean; hangul-latin typos
- Draft/preview URLs or unpublished slugs in Related guides
- Thin FAQ or template FAQ questions
- Missing Editorial Overview / methodology / Related guides / Final Verdict (when template requires them)

Write original, people-first, AdSense-safe editorial content. English primary; Korean is a faithful full translation, not a summary.`;
}
