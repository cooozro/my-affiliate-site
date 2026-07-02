/**
 * FAQ section audit helpers (no @cursor/sdk — safe for Next.js server bundle).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import {
  isMechanicalFaqSection,
  LEGACY_TEMPLATE_QUESTIONS_EN,
  LEGACY_TEMPLATE_QUESTIONS_KO,
} from "./faq-quality.mjs";

export const FAQ_HEADING_RE =
  /^##\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*$/m;

export const MIN_FAQ_BY_PROFILE = {
  "buying-guide": 3,
  "head-to-head": 3,
  "scenario-guide": 3,
  explainer: 5,
  checklist: 3,
  editorial: 0,
};

const TEMPLATE_FAQ_SIGNATURES = {
  ko: LEGACY_TEMPLATE_QUESTIONS_KO,
  en: LEGACY_TEMPLATE_QUESTIONS_EN,
};

function extractFaqSectionBounds(body) {
  const start = body.search(FAQ_HEADING_RE);
  if (start < 0) return null;

  const afterHeading = body.slice(start);
  const nextH2 = afterHeading.slice(1).search(/^##\s+/m);
  const end = nextH2 >= 0 ? start + 1 + nextH2 : body.length;
  return { start, end };
}

export function extractFaqSectionText(body) {
  const bounds = extractFaqSectionBounds(body);
  if (!bounds) return "";
  return body.slice(bounds.start, bounds.end);
}

export function countFaqInBody(body) {
  const section = extractFaqSectionText(body);
  if (!section) return 0;
  return (section.match(/^###\s+/gm) ?? []).length;
}

export function isTemplatedFaqBody(body, locale) {
  const section = extractFaqSectionText(body);
  if (!section) return false;

  if (isMechanicalFaqSection(section, locale)) return true;

  const patterns = TEMPLATE_FAQ_SIGNATURES[locale] ?? TEMPLATE_FAQ_SIGNATURES.en;
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(section)) hits += 1;
  }
  return hits >= 2;
}

export function needsFaqLlmRepair(body, locale, profile, options = {}) {
  const minFaq = options.minFaq ?? MIN_FAQ_BY_PROFILE[profile] ?? 3;
  if (minFaq <= 0) return false;
  if (options.force) return true;

  const count = countFaqInBody(body);
  if (count < minFaq) return true;
  if (isTemplatedFaqBody(body, locale)) return true;
  return false;
}

/**
 * Sync repair is disabled — use repairFaqSectionWithLlm / repairAllFaqSectionsWithLlm.
 */
export function repairFaqSectionInBody(body, locale, slug, data, options = {}) {
  if (needsFaqLlmRepair(body, locale, data.contentProfile ?? "buying-guide", options)) {
    return {
      body,
      repairs: [
        `${slug}/${locale}.md: FAQ needs LLM repair (missing or templated) — run repair-faq-llm`,
      ],
      changed: false,
    };
  }
  return { body, repairs: [], changed: false };
}

export function auditFaqSection(body, label, profile) {
  const minFaq = MIN_FAQ_BY_PROFILE[profile] ?? 0;
  if (minFaq <= 0) return [];

  if (!FAQ_HEADING_RE.test(body)) {
    return [`${label}: missing FAQ / 자주 묻는 질문 section`];
  }

  const locale = label.endsWith("/ko.md") ? "ko" : "en";
  if (isTemplatedFaqBody(body, locale)) {
    return [`${label}: FAQ uses mechanical/template questions — needs LLM rewrite`];
  }

  const count = countFaqInBody(body);
  if (count < minFaq) {
    return [
      `${label}: FAQ needs at least ${minFaq} entries (### headings, found ${count})`,
    ];
  }

  return [];
}

export function scanTemplatedContentIssues(root = process.cwd()) {
  const postsRoot = path.join(root, "content", "posts");
  const issues = {
    templatedFaq: [],
    mechanicalFaq: [],
    missingFaq: [],
    duplicateEnSupplementHeadings: new Map(),
  };

  if (!fs.existsSync(postsRoot)) return issues;

  for (const slug of fs
    .readdirSync(postsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)) {
    if (slug === "welcome" || slug === "adsense-seo-checklist") continue;

    for (const locale of ["en", "ko"]) {
      const filePath = path.join(postsRoot, slug, `${locale}.md`);
      if (!fs.existsSync(filePath)) continue;
      const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
      const profile = data.contentProfile ?? "buying-guide";
      const body = content.trim();
      const label = `${slug}/${locale}.md`;

      if (MIN_FAQ_BY_PROFILE[profile] > 0) {
        if (!FAQ_HEADING_RE.test(body)) {
          issues.missingFaq.push(label);
        } else if (isMechanicalFaqSection(extractFaqSectionText(body), locale)) {
          issues.mechanicalFaq.push(label);
        } else if (isTemplatedFaqBody(body, locale)) {
          issues.templatedFaq.push(label);
        }
      }
    }

    const enPath = path.join(postsRoot, slug, "en.md");
    if (fs.existsSync(enPath)) {
      const enBody = matter(fs.readFileSync(enPath, "utf8")).content;
      const supplementMatch = enBody.match(
        /^## (Seasonal install|Room context|Real-world listening|Floor plan|Desk fit|Extended pre-purchase)/m,
      );
      if (supplementMatch) {
        const heading = supplementMatch[0];
        issues.duplicateEnSupplementHeadings.set(heading, [
          ...(issues.duplicateEnSupplementHeadings.get(heading) ?? []),
          slug,
        ]);
      }
    }
  }

  return issues;
}
