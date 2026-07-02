/**
 * FAQ section LLM repair (CLI / GHA only — imports @cursor/sdk lazily).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import {
  countFaqInBody,
  isTemplatedFaqBody,
  MIN_FAQ_BY_PROFILE,
  needsFaqLlmRepair,
} from "./faq-section-audit.mjs";
import { writeContentRepair } from "./post-updated-at.mjs";

const FAQ_HEADING_RE =
  /^##\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*$/m;

const INSERT_BEFORE_RE =
  /^##\s*(Related guides|관련 가이드|Final Verdict|최종 평가|Conclusion|결론)\s*$/m;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const { generateFaqEntries } = await import("./faq-llm.mjs");
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

export function repairFaqSectionForPost(root, slug, options = {}) {
  return repairFaqSectionForPostWithLlm(root, slug, options);
}

export { sleep };
