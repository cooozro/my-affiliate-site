import fs from "fs";
import path from "path";
import matter from "gray-matter";

import {
  FORMULAIC_TITLE_PATTERNS,
  MISLEADING_SOURCE_PATTERNS,
} from "./editorial-standards.mjs";
import {
  CONTENT_PROFILES,
  MIN_EN_BODY_BYTES,
  MIN_KO_BODY_CHARS,
  PROFILE_MIN_BODY_CHARS,
} from "./content-profiles.mjs";

export const MIN_BODY_CHARS = 2500;
export const MIN_DESCRIPTION_CHARS = 50;
export const MAX_DESCRIPTION_CHARS = 160;

const FORBIDDEN_PATTERNS = [
  /<!--\s*ad-break\s*-->/i,
  /adsense/i,
  /googlesyndication/i,
  /placeholder.*ad/i,
];

const METHODOLOGY_PATTERN =
  /##\s*(분석 방법론|Analysis methodology|Methodology)/i;
const EDITORS_NOTE_PATTERN =
  /##\s*(Editorial Overview|편집부 개요)/i;
const FINAL_VERDICT_PATTERN =
  /##\s*(Final Verdict|최종 평가)/i;
const WHO_SHOULD_BUY_PATTERN =
  /(Who should buy|이런 분께 추천)/i;
const WHO_SHOULD_SKIP_PATTERN =
  /(Who should skip|이런 분은 패스)/i;
const CONCLUSION_PATTERN = /##\s*(결론|Conclusion)/i;
const SCENARIO_PATTERN =
  /##\s*(Scenario:\s|시나리오:\s)/i;
const FAQ_PATTERN = /##\s*(FAQ|자주 묻는 질문|Frequently asked)/i;
const PRODUCT_SECTION_PATTERN = /^##\s*\d+\.\s+/gm;

function hasCoverImage(root, data) {
  if (!data.coverImage) return false;
  return fs.existsSync(path.join(root, "public", data.coverImage));
}

function auditShared(root, slug, locale, raw, profile, options) {
  const { forPublish = true } = options;
  const issues = [];
  const { data, content } = matter(raw);
  const body = content.trim();
  const label = `${slug}/${locale}.md`;

  if (!data.title?.trim()) {
    issues.push(`${label}: missing title`);
  } else if (profile === "buying-guide") {
    for (const pattern of FORMULAIC_TITLE_PATTERNS) {
      if (pattern.test(data.title.trim())) {
        issues.push(
          `${label}: title looks formulaic (vary format — see editorial-standards.mjs)`,
        );
        break;
      }
    }
  }

  for (const pattern of MISLEADING_SOURCE_PATTERNS) {
    if (pattern.test(raw)) {
      issues.push(
        `${label}: misleading API/database claim — use public editorial sources only`,
      );
      break;
    }
  }

  const desc = data.description?.trim() ?? "";
  if (!desc) {
    issues.push(`${label}: missing description`);
  } else if (desc.length < MIN_DESCRIPTION_CHARS) {
    issues.push(`${label}: description under ${MIN_DESCRIPTION_CHARS} chars`);
  } else if (desc.length > MAX_DESCRIPTION_CHARS) {
    issues.push(`${label}: description over ${MAX_DESCRIPTION_CHARS} chars`);
  }

  if (forPublish && !data.draft && !data.date) {
    issues.push(`${label}: missing date`);
  }

  if (!data.coverImage) {
    issues.push(`${label}: missing coverImage`);
  } else if (!hasCoverImage(root, data)) {
    issues.push(`${label}: cover image file not found`);
  } else if (!data.coverImageAlt?.trim()) {
    issues.push(`${label}: missing coverImageAlt`);
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(raw)) {
      issues.push(`${label}: forbidden pattern (${pattern})`);
    }
  }

  const minChars =
    PROFILE_MIN_BODY_CHARS[profile] ?? PROFILE_MIN_BODY_CHARS.editorial;
  if (profile !== "editorial" && body.length < minChars) {
    issues.push(
      `${label}: body too short (${body.length} chars, min ${minChars} for ${profile})`,
    );
  } else if (profile === "editorial" && body.length < 800) {
    issues.push(`${label}: body too short (${body.length} chars, min 800)`);
  }

  if (profile === "editorial") {
    return issues;
  }

  if (!METHODOLOGY_PATTERN.test(body)) {
    issues.push(`${label}: missing methodology section (Google E-E-A-T)`);
  }

  if (!EDITORS_NOTE_PATTERN.test(body)) {
    issues.push(`${label}: missing Editorial Overview section`);
  }

  if (!/##\s*(Related guides|관련 가이드)/i.test(body)) {
    issues.push(`${label}: missing Related guides / 관련 가이드 internal links section`);
  }

  return { issues, body, label };
}

function auditBuyingGuide(body, label) {
  const issues = [];

  const h2Count = (body.match(/^##\s+/gm) ?? []).length;
  if (h2Count < 4) {
    issues.push(`${label}: need at least 4 H2 sections (found ${h2Count})`);
  }

  if (!/\|.+\|/.test(body)) {
    issues.push(`${label}: missing comparison table`);
  }

  if (!FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing Final Verdict section`);
  }

  if (!WHO_SHOULD_BUY_PATTERN.test(body)) {
    issues.push(`${label}: missing Who should buy / 이런 분께 추천 section`);
  }

  if (!WHO_SHOULD_SKIP_PATTERN.test(body)) {
    issues.push(`${label}: missing Who should skip / 이런 분은 패스 section`);
  }

  const listItems = (body.match(/^\d+\.\s+/gm) ?? []).length;
  if (listItems < 3) {
    issues.push(`${label}: need at least 3 numbered checklist items`);
  }

  return issues;
}

function auditHeadToHead(body, label) {
  const issues = [];

  if (!/\|.+\|/.test(body)) {
    issues.push(`${label}: missing comparison table`);
  }

  const productSections = (body.match(PRODUCT_SECTION_PATTERN) ?? []).length;
  if (productSections < 2) {
    issues.push(`${label}: head-to-head needs at least 2 numbered product sections`);
  }

  if (
    !/(Scenario winners|시나리오별 승자|Scenario winner)/i.test(body) &&
    !FINAL_VERDICT_PATTERN.test(body)
  ) {
    issues.push(`${label}: missing Scenario winners or Final Verdict section`);
  }

  if (!FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing Final Verdict section`);
  }

  return issues;
}

function auditScenarioGuide(body, label) {
  const issues = [];

  const scenarios = (body.match(
    new RegExp(SCENARIO_PATTERN.source, "gi"),
  ) ?? []).length;
  if (scenarios < 3) {
    issues.push(`${label}: scenario-guide needs at least 3 scenario sections (found ${scenarios})`);
  }

  if (!/\|.+\|/.test(body)) {
    issues.push(`${label}: missing comparison table`);
  }

  if (!FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing Final Verdict section`);
  }

  return issues;
}

function auditExplainer(body, label) {
  const issues = [];

  if (!FAQ_PATTERN.test(body)) {
    issues.push(`${label}: explainer needs FAQ / 자주 묻는 질문 section`);
  }

  const faqItems = (body.match(/^###\s+.+\?/gm) ?? []).length;
  if (faqItems < 5) {
    issues.push(`${label}: explainer needs at least 5 FAQ entries (### headings, found ${faqItems})`);
  }

  if (!/\|.+\|/.test(body)) {
    issues.push(`${label}: missing reference or comparison table`);
  }

  if (
    !/(Key takeaways|핵심 정리)/i.test(body) &&
    (body.match(/^\d+\.\s+/gm) ?? []).length < 3
  ) {
    issues.push(`${label}: explainer needs Key takeaways or numbered summary (≥3 items)`);
  }

  return issues;
}

function auditChecklist(body, label) {
  const issues = [];

  const listItems = (body.match(/^\d+\.\s+/gm) ?? []).length;
  if (listItems < 7) {
    issues.push(`${label}: checklist needs at least 7 numbered items (found ${listItems})`);
  }

  if (!FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing Final Verdict section`);
  }

  return issues;
}

/**
 * Google Search Essentials / people-first self-audit before publish.
 */
export function auditLocalePost(root, slug, locale, raw, options = {}) {
  const { forPublish = true, profile = "buying-guide", publishedSlugs } = options;

  const shared = auditShared(root, slug, locale, raw, profile, { forPublish });
  if (Array.isArray(shared)) {
    return shared;
  }

  const { issues, body, label } = shared;

  if (profile === "buying-guide") {
    issues.push(...auditBuyingGuide(body, label));
  } else if (profile === "head-to-head") {
    issues.push(...auditHeadToHead(body, label));
  } else if (profile === "scenario-guide") {
    issues.push(...auditScenarioGuide(body, label));
  } else if (profile === "explainer") {
    issues.push(...auditExplainer(body, label));
  } else if (profile === "checklist") {
    issues.push(...auditChecklist(body, label));
  }

  if (publishedSlugs) {
    issues.push(...auditInternalBlogLinks(slug, locale, body, publishedSlugs));
  }

  return issues;
}

const INTERNAL_BLOG_LINK_RE = /]\(\/(?:en|ko)\/blog\/([a-z0-9][a-z0-9-]*)\)/gi;

export function listPublishedSlugs(root) {
  const postsDir = path.join(root, "content", "posts");
  const slugs = new Set();
  if (!fs.existsSync(postsDir)) return slugs;

  for (const entry of fs.readdirSync(postsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const enPath = path.join(postsDir, entry.name, "en.md");
    if (!fs.existsSync(enPath)) continue;
    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.draft) slugs.add(entry.name);
  }

  return slugs;
}

export function auditInternalBlogLinks(slug, locale, body, publishedSlugs) {
  const issues = [];
  const label = `${slug}/${locale}.md`;

  for (const match of body.matchAll(INTERNAL_BLOG_LINK_RE)) {
    const target = match[1];
    if (!publishedSlugs.has(target)) {
      issues.push(
        `${label}: broken internal link → /blog/${target} (post missing or draft)`,
      );
    }
  }

  return issues;
}

export function resolveContentProfile(data) {
  if (data.contentProfile && CONTENT_PROFILES.includes(data.contentProfile)) {
    return data.contentProfile;
  }
  if (data.contentProfile === "editorial") {
    return "editorial";
  }
  return data.liveData ? "buying-guide" : "editorial";
}

export function auditPostForPublish(root, slug) {
  const postDir = path.join(root, "content", "posts", slug);
  const issues = [];
  const bodyLengths = {};
  const publishedSlugs = listPublishedSlugs(root);

  for (const locale of ["en", "ko"]) {
    const filePath = path.join(postDir, `${locale}.md`);
    if (!fs.existsSync(filePath)) {
      issues.push(`${slug}/${locale}.md: missing file`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const profile = resolveContentProfile(data);
    bodyLengths[locale] = content.trim().length;
    issues.push(
      ...auditLocalePost(root, slug, locale, raw, {
        forPublish: true,
        profile,
        publishedSlugs,
      }),
    );
  }

  const koLen = bodyLengths.ko ?? 0;
  if (koLen > 0 && koLen < MIN_KO_BODY_CHARS) {
    issues.push(
      `${slug}/ko.md: Korean body too short (${koLen} chars, need ≥${MIN_KO_BODY_CHARS})`,
    );
  }

  const enLen = bodyLengths.en ?? 0;
  if (enLen > 0) {
    const enPath = path.join(postDir, "en.md");
    const enBody = matter(fs.readFileSync(enPath, "utf8")).content.trim();
    const enBytes = Buffer.byteLength(enBody, "utf8");
    if (enBytes < MIN_EN_BODY_BYTES) {
      issues.push(
        `${slug}/en.md: English body too short (${enBytes} bytes, need ≥${MIN_EN_BODY_BYTES})`,
      );
    }
  }

  return issues;
}

export function auditPublishedPost(root, slug, locale, publishedSlugs) {
  const filePath = path.join(root, "content", "posts", slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) {
    return [`${slug}/${locale}.md: missing file`];
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  if (data.draft) return [];

  const profile = resolveContentProfile(data);
  return auditLocalePost(root, slug, locale, raw, {
    forPublish: true,
    profile,
    publishedSlugs,
  });
}
