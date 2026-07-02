/**
 * FAQ section audit + LLM auto-repair for published posts.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { generateFaqEntries, sleep } from "./faq-llm.mjs";
import {
  isMechanicalFaqSection,
  LEGACY_TEMPLATE_QUESTIONS_EN,
  LEGACY_TEMPLATE_QUESTIONS_KO,
} from "./faq-quality.mjs";
import { writeContentRepair } from "./post-updated-at.mjs";

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

const INSERT_BEFORE_RE =
  /^##\s*(Related guides|관련 가이드|Final Verdict|최종 평가|Conclusion|결론)\s*$/m;

function postsDir(root) {
  return path.join(root, "content", "posts");
}

function faqHeading(locale) {
  return locale === "ko" ? "## 자주 묻는 질문" : "## FAQ";
}

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

function formatFaqBlock(locale, entries) {
  const lines = [faqHeading(locale), ""];
  for (const entry of entries) {
    lines.push(`### ${entry.q}`);
    lines.push("");
    lines.push(entry.a);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function replaceFaqSection(body, locale, entries) {
  const block = formatFaqBlock(locale, entries);
  const bounds = extractFaqSectionBounds(body);

  if (bounds) {
    const before = body.slice(0, bounds.start).trimEnd();
    const after = body.slice(bounds.end).trimStart();
    return [before, block, after].filter(Boolean).join("\n\n").trim();
  }

  const trimmed = body.trim();
  const match = trimmed.match(INSERT_BEFORE_RE);
  if (match?.index != null) {
    return `${trimmed.slice(0, match.index).trimEnd()}\n\n${block}\n\n${trimmed.slice(match.index).trimStart()}`.trim();
  }
  return `${trimmed}\n\n${block}`.trim();
}

/**
 * Sync repair is disabled — use repairFaqSectionWithLlm / repairAllFaqSectionsWithLlm.
 * @returns {{ body: string, repairs: string[], changed: boolean }}
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

export async function repairFaqSectionWithLlm(
  root,
  slug,
  locale,
  options = {},
) {
  const filePath = path.join(postsDir(root), slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) {
    return { changed: false, repairs: [], skipped: true };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  if (data.draft && !options.includeDrafts) {
    return { changed: false, repairs: [], skipped: true };
  }

  const profile = data.contentProfile ?? "buying-guide";
  const minFaq = MIN_FAQ_BY_PROFILE[profile] ?? 3;
  if (minFaq <= 0) {
    return { changed: false, repairs: [], skipped: true };
  }

  const body = content.trim();
  if (!needsFaqLlmRepair(body, locale, profile, options)) {
    return { changed: false, repairs: [], skipped: true };
  }

  const entries = await generateFaqEntries({
    slug,
    locale,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    body,
    data,
    minCount: minFaq,
  });

  const newBody = replaceFaqSection(body, locale, entries);
  if (newBody === body) {
    return { changed: false, repairs: [], skipped: true };
  }

  writeContentRepair(filePath, data, newBody, fs, matter);

  const reason = isTemplatedFaqBody(body, locale)
    ? "replaced mechanical FAQ"
    : countFaqInBody(body) === 0
      ? "inserted LLM FAQ"
      : "expanded LLM FAQ";

  return {
    changed: true,
    repairs: [`${slug}/${locale}.md: ${reason} (${entries.length} entries)`],
  };
}

export async function repairFaqSectionForPostWithLlm(root, slug, options = {}) {
  const allRepairs = [];
  let anyChanged = false;

  for (const locale of ["en", "ko"]) {
    const result = await repairFaqSectionWithLlm(root, slug, locale, options);
    if (result.changed) anyChanged = true;
    allRepairs.push(...result.repairs);
    if (options.delayMs) await sleep(options.delayMs);
  }

  return { changed: anyChanged, repairs: allRepairs };
}

export async function repairAllFaqSectionsWithLlm(root = process.cwd(), options = {}) {
  const postsRoot = postsDir(root);
  if (!fs.existsSync(postsRoot)) {
    return { scanned: 0, changed: 0, repairs: [], errors: [] };
  }

  let slugs = fs
    .readdirSync(postsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((s) => s !== "welcome" && s !== "adsense-seo-checklist");

  if (options.slug) {
    slugs = slugs.filter((s) => s === options.slug);
  }

  const summary = {
    scanned: 0,
    changed: 0,
    repairs: [],
    errors: [],
    templatedFound: 0,
    missingFound: 0,
  };

  for (const slug of slugs.sort()) {
    summary.scanned += 1;

    for (const locale of ["en", "ko"]) {
      const filePath = path.join(postsRoot, slug, `${locale}.md`);
      if (!fs.existsSync(filePath)) continue;
      const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
      const profile = data.contentProfile ?? "buying-guide";
      const body = content.trim();

      if (isTemplatedFaqBody(body, locale)) summary.templatedFound += 1;
      if (countFaqInBody(body) < (MIN_FAQ_BY_PROFILE[profile] ?? 3)) {
        summary.missingFound += 1;
      }
    }

    try {
      const result = await repairFaqSectionForPostWithLlm(root, slug, {
        includeDrafts: options.includeDrafts ?? true,
        force: options.force,
        delayMs: options.delayMs ?? 400,
      });
      if (result.changed) summary.changed += 1;
      summary.repairs.push(...result.repairs);
    } catch (error) {
      summary.errors.push({
        slug,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}

/** @deprecated Use repairAllFaqSectionsWithLlm */
export async function repairAllFaqSections(root = process.cwd(), options = {}) {
  return repairAllFaqSectionsWithLlm(root, options);
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

export function repairFaqSectionForPost(root, slug, options = {}) {
  return repairFaqSectionForPostWithLlm(root, slug, options);
}

/**
 * Corpus scan for duplicate/templated content patterns (reporting).
 */
export function scanTemplatedContentIssues(root = process.cwd()) {
  const postsRoot = postsDir(root);
  const issues = {
    templatedFaq: [],
    mechanicalFaq: [],
    missingFaq: [],
    duplicateEnSupplementHeadings: new Map(),
  };

  if (!fs.existsSync(postsRoot)) return issues;

  for (const slug of fs.readdirSync(postsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
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
      const supplementMatch = enBody.match(/^## (Seasonal install|Room context|Real-world listening|Floor plan|Desk fit|Extended pre-purchase)/m);
      if (supplementMatch) {
        const heading = supplementMatch[0];
        issues.duplicateEnSupplementHeadings.set(
          heading,
          [...(issues.duplicateEnSupplementHeadings.get(heading) ?? []), slug],
        );
      }
    }
  }

  return issues;
}
