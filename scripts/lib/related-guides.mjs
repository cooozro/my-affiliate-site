/**
 * Auto-repair Related guides / 관련 가이드 sections by topic relevance.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { inferPostTopic } from "./infer-post-topic.mjs";
import { listPublishedSlugs } from "./content-quality.mjs";

export const MAX_RELATED_GUIDE_LINKS = 5;
export const MIN_RELATED_GUIDE_LINKS = 3;

const HEADING = {
  en: "## Related guides",
  ko: "## 관련 가이드",
};

const BULLET_LINK_RE =
  /^-\s*\[([^\]]+)\]\((\/en|\/ko)\/blog\/([a-z0-9][a-z0-9-]*)\)\s*(?:[—–-]\s*(.+))?$/;

function postsDir(root) {
  return path.join(root, "content", "posts");
}

function truncateBlurb(text, max = 90) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function defaultBlurb(candidate, locale) {
  const desc =
    locale === "ko"
      ? candidate.descriptionKo || candidate.descriptionEn
      : candidate.descriptionEn;
  const blurb = truncateBlurb(desc);
  if (blurb) return blurb;
  return locale === "ko" ? "관련 가이드" : "Related guide";
}

/** @returns {Map<string, object>} */
export function loadPublishedPostIndex(root) {
  const index = new Map();
  const published = listPublishedSlugs(root);

  for (const slug of published) {
    const entry = {
      slug,
      topic: null,
      tags: [],
      titleEn: slug,
      titleKo: slug,
      descriptionEn: "",
      descriptionKo: "",
      publishedAt: null,
    };

    for (const locale of ["en", "ko"]) {
      const filePath = path.join(postsDir(root), slug, `${locale}.md`);
      if (!fs.existsSync(filePath)) continue;
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      if (locale === "en") {
        entry.titleEn = String(data.title ?? slug);
        entry.descriptionEn = String(data.description ?? "");
        entry.tags = Array.isArray(data.tags) ? data.tags : [];
        entry.topic = inferPostTopic(slug, data);
        entry.publishedAt = data.publishedAt ?? data.date ?? null;
      } else {
        entry.titleKo = String(data.title ?? slug);
        entry.descriptionKo = String(data.description ?? "");
      }
    }
    index.set(slug, entry);
  }

  return index;
}

export function scoreRelatedness(source, candidate) {
  if (source.slug === candidate.slug) return -1;

  let score = 0;
  const srcTopic = source.topic ?? {};
  const candTopic = candidate.topic ?? {};

  if (srcTopic.id && srcTopic.id === candTopic.id) score += 120;
  if (srcTopic.category && srcTopic.category === candTopic.category) score += 45;
  if (srcTopic.cluster && srcTopic.cluster === candTopic.cluster) score += 35;

  const srcTags = new Set((source.tags ?? []).map((t) => String(t).toLowerCase()));
  for (const tag of candidate.tags ?? []) {
    if (srcTags.has(String(tag).toLowerCase())) score += 12;
  }

  const srcWords = new Set(
    `${source.slug} ${source.titleEn}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
  for (const word of `${candidate.slug} ${candidate.titleEn}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)) {
    if (srcWords.has(word)) score += 4;
  }

  if (candidate.publishedAt) {
    const ageDays =
      (Date.now() - new Date(candidate.publishedAt).getTime()) / 86_400_000;
    score += Math.max(0, 15 - ageDays / 30);
  }

  return score;
}

function findRelatedSectionRange(lines, locale) {
  const heading = HEADING[locale];
  const headingIdx = lines.findIndex((line) => line.trim() === heading);
  if (headingIdx === -1) return null;

  let nextSectionIdx = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      nextSectionIdx = i;
      break;
    }
  }

  return { headingIdx, nextSectionIdx };
}

function parseExistingLinks(sectionText, locale, selfSlug, index) {
  const links = [];
  const seen = new Set();

  for (const line of sectionText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;

    const match = trimmed.match(BULLET_LINK_RE);
    if (!match) continue;

    const [, , pathLocale, targetSlug, blurb] = match;
    if (pathLocale !== `/${locale}`) continue;
    if (targetSlug === selfSlug || seen.has(targetSlug)) continue;
    if (!index.has(targetSlug)) continue;

    seen.add(targetSlug);
    links.push({
      slug: targetSlug,
      blurb: blurb?.trim() || null,
      score: scoreRelatedness(index.get(selfSlug), index.get(targetSlug)),
    });
  }

  return links;
}

function pickRelatedSlugs(source, index, existingLinks, options = {}) {
  const maxLinks = options.maxLinks ?? MAX_RELATED_GUIDE_LINKS;
  const minLinks = options.minLinks ?? MIN_RELATED_GUIDE_LINKS;
  const others = [...index.keys()].filter((s) => s !== source.slug);
  const targetCount = Math.min(maxLinks, Math.max(minLinks, others.length));

  const selected = new Map();
  for (const link of existingLinks) {
    selected.set(link.slug, {
      slug: link.slug,
      blurb: link.blurb,
      score: scoreRelatedness(source, index.get(link.slug)),
    });
  }

  const ranked = others
    .filter((slug) => !selected.has(slug))
    .map((slug) => ({
      slug,
      blurb: null,
      score: scoreRelatedness(source, index.get(slug)),
    }))
    .sort((a, b) => b.score - a.score);

  for (const candidate of ranked) {
    if (selected.size >= targetCount) break;
    selected.set(candidate.slug, candidate);
  }

  return [...selected.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLinks);
}

function formatLinkLine(locale, entry, index) {
  const candidate = index.get(entry.slug);
  const prefix = `/${locale}/blog/`;
  const title = locale === "ko" ? candidate.titleKo : candidate.titleEn;
  const blurb = entry.blurb || defaultBlurb(candidate, locale);
  return `- [${title}](${prefix}${entry.slug}) — ${blurb}`;
}

function insertHeadingIndex(lines) {
  const anchors = [
    "## Final Verdict",
    "## 최종 평가",
    "## Conclusion",
    "## 결론",
    "## Five checks",
    "## FAQ",
    "## 자주 묻는 질문",
  ];

  for (const anchor of anchors) {
    const idx = lines.findIndex((line) => line.trim().startsWith(anchor));
    if (idx !== -1) return idx;
  }

  return lines.length;
}

/** @returns {{ body: string, repairs: string[], changed: boolean }} */
export function repairRelatedGuidesInBody(
  body,
  locale,
  slug,
  index,
  options = {},
) {
  const repairs = [];
  if (!index.has(slug)) {
    return { body, repairs, changed: false };
  }

  const source = index.get(slug);
  const lines = body.split("\n");
  const range = findRelatedSectionRange(lines, locale);
  const existingSectionText = range
    ? lines.slice(range.headingIdx + 1, range.nextSectionIdx).join("\n")
    : "";

  const existingLinks = range
    ? parseExistingLinks(existingSectionText, locale, slug, index)
    : [];

  const picked = pickRelatedSlugs(source, index, existingLinks, options);
  if (picked.length === 0) {
    return { body, repairs, changed: false };
  }

  const linkLines = picked.map((entry) => formatLinkLine(locale, entry, index));
  const newSection = `${HEADING[locale]}\n\n${linkLines.join("\n")}\n`;

  let newBody;
  if (range) {
    const before = lines.slice(0, range.headingIdx).join("\n");
    const after = lines.slice(range.nextSectionIdx).join("\n");
    newBody = [before, newSection.trimEnd(), after]
      .filter((part, i, arr) => part.length > 0 || i < arr.length - 1)
      .join("\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  } else {
    const insertAt = insertHeadingIndex(lines);
    const before = lines.slice(0, insertAt).join("\n");
    const after = lines.slice(insertAt).join("\n");
    newBody = [before, newSection.trimEnd(), after].filter(Boolean).join("\n\n").trim();
    repairs.push(`${slug}/${locale}.md: inserted Related guides section`);
  }

  const beforeCount = existingLinks.length;
  const afterCount = picked.length;
  if (newBody !== body.trim()) {
    repairs.push(
      `${slug}/${locale}.md: Related guides ${beforeCount} → ${afterCount} links (relevance order, max ${MAX_RELATED_GUIDE_LINKS})`,
    );
  }

  return {
    body: newBody,
    repairs,
    changed: newBody !== body.trim(),
  };
}

export function repairRelatedGuidesForPost(root, slug, options = {}) {
  const index = options.index ?? loadPublishedPostIndex(root);
  const allRepairs = [];
  let anyChanged = false;

  for (const locale of ["en", "ko"]) {
    const filePath = path.join(postsDir(root), slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    if (data.draft && !options.includeDrafts) continue;

    const result = repairRelatedGuidesInBody(
      content.trim(),
      locale,
      slug,
      index,
      options,
    );

    if (result.changed) {
      fs.writeFileSync(filePath, matter.stringify(result.body, data), "utf8");
      anyChanged = true;
    }
    allRepairs.push(...result.repairs);
  }

  return { changed: anyChanged, repairs: allRepairs, index };
}

export function repairAllRelatedGuides(root = process.cwd(), options = {}) {
  const index = loadPublishedPostIndex(root);
  const slugs = options.includeDrafts
    ? fs
        .readdirSync(postsDir(root), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [...index.keys()];

  const summary = { scanned: 0, changed: 0, repairs: [] };
  for (const slug of slugs.sort()) {
    if (slug === "welcome" || slug === "adsense-seo-checklist") continue;
    summary.scanned += 1;
    const result = repairRelatedGuidesForPost(root, slug, { ...options, index });
    if (result.changed) summary.changed += 1;
    summary.repairs.push(...result.repairs);
  }
  return summary;
}
