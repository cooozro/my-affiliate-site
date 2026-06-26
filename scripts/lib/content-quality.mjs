import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const MIN_BODY_CHARS = 2500;
export const MIN_DESCRIPTION_CHARS = 50;
export const MAX_DESCRIPTION_CHARS = 160;

import {
  FORMULAIC_TITLE_PATTERNS,
  MISLEADING_SOURCE_PATTERNS,
} from "./editorial-standards.mjs";

const FORBIDDEN_PATTERNS = [
  /<!--\s*ad-break\s*-->/i,
  /adsense/i,
  /googlesyndication/i,
  /placeholder.*ad/i,
];

const METHODOLOGY_PATTERN =
  /##\s*(분석 방법론|Analysis methodology|Methodology)/i;
const EDITORS_NOTE_PATTERN =
  /##\s*(Editor'?s Note|에디터 노트)/i;
const FINAL_VERDICT_PATTERN =
  /##\s*(Final Verdict|최종 평가)/i;
const WHO_SHOULD_BUY_PATTERN =
  /(Who should buy|이런 분께 추천)/i;
const WHO_SHOULD_SKIP_PATTERN =
  /(Who should skip|이런 분은 패스)/i;
const CONCLUSION_PATTERN = /##\s*(결론|Conclusion)/i;

function hasCoverImage(root, data) {
  if (!data.coverImage) return false;
  return fs.existsSync(path.join(root, "public", data.coverImage));
}

/**
 * Google Search Essentials / people-first self-audit before publish.
 * Returns human-readable issue strings.
 */
export function auditLocalePost(root, slug, locale, raw, options = {}) {
  const { forPublish = true, profile = "buying-guide" } = options;
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

  if (forPublish && !data.date) {
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

  if (profile !== "buying-guide") {
    if (body.length < 800) {
      issues.push(`${label}: body too short (${body.length} chars, min 800)`);
    }
    return issues;
  }

  if (body.length < MIN_BODY_CHARS) {
    issues.push(
      `${label}: body too short (${body.length} chars, min ${MIN_BODY_CHARS})`,
    );
  }

  const h2Count = (body.match(/^##\s+/gm) ?? []).length;
  if (h2Count < 4) {
    issues.push(`${label}: need at least 4 H2 sections (found ${h2Count})`);
  }

  if (!/\|.+\|/.test(body)) {
    issues.push(`${label}: missing comparison table`);
  }

  if (!METHODOLOGY_PATTERN.test(body)) {
    issues.push(`${label}: missing methodology section (Google E-E-A-T)`);
  }

  if (!EDITORS_NOTE_PATTERN.test(body)) {
    issues.push(`${label}: missing Editor's Note section (see BUYING_GUIDE_TEMPLATE.md)`);
  }

  if (!FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing Final Verdict section (see BUYING_GUIDE_TEMPLATE.md)`);
  }

  if (!WHO_SHOULD_BUY_PATTERN.test(body)) {
    issues.push(`${label}: missing Who should buy / 이런 분께 추천 section`);
  }

  if (!WHO_SHOULD_SKIP_PATTERN.test(body)) {
    issues.push(`${label}: missing Who should skip / 이런 분은 패스 section`);
  }

  if (!CONCLUSION_PATTERN.test(body) && !FINAL_VERDICT_PATTERN.test(body)) {
    issues.push(`${label}: missing conclusion or final verdict section`);
  }

  const listItems = (body.match(/^\d+\.\s+/gm) ?? []).length;
  if (listItems < 3) {
    issues.push(`${label}: need at least 3 numbered checklist items`);
  }

  return issues;
}

function resolveContentProfile(data) {
  if (data.contentProfile === "buying-guide" || data.contentProfile === "editorial") {
    return data.contentProfile;
  }
  return data.liveData ? "buying-guide" : "editorial";
}

export function auditPostForPublish(root, slug) {
  const postDir = path.join(root, "content", "posts", slug);
  const issues = [];

  for (const locale of ["en", "ko"]) {
    const filePath = path.join(postDir, `${locale}.md`);
    if (!fs.existsSync(filePath)) {
      issues.push(`${slug}/${locale}.md: missing file`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);
    const profile = resolveContentProfile(data);
    issues.push(
      ...auditLocalePost(root, slug, locale, raw, {
        forPublish: true,
        profile,
      }),
    );
  }

  return issues;
}

export function auditPublishedPost(root, slug, locale) {
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
  });
}
