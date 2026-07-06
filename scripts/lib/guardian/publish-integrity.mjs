/**
 * Pipeline Guardian — publish integrity gate (do not import outside guardian/index).
 * Auto-repair then verify before draft save / LIVE publish.
 * Phases: draft (lenient) | publish (strict).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import {
  auditPostForPublish,
  listPublishedSlugs,
  resolveContentProfile,
  MAX_DESCRIPTION_CHARS,
} from "../content-quality.mjs";
import {
  auditContentPolicyText,
  auditContentPolicyTitle,
  HANGUL_LATIN_TYPO_RE,
  repairContentPolicyText,
} from "./content-policy.mjs";
import {
  repairRelatedGuidesInBody,
  MAX_RELATED_GUIDE_LINKS,
  loadPublishedPostIndex,
} from "../related-guides.mjs";
import { repairShortEnglishBody, expandEnglishBodyIfNeeded } from "../body-length-repair.mjs";
import { writeContentRepair } from "../post-updated-at.mjs";
import { FORMULAIC_TITLE_PATTERNS } from "./editorial-standards.mjs";
import { CONTENT_PROFILES } from "../content-profiles.mjs";
import { inferPostTopic } from "../infer-post-topic.mjs";
import { validateReplenishTopicUnique } from "./automation-guard.mjs";
import { wouldViolateTopicDiversity } from "../topic-diversity.mjs";
import {
  assetKey,
  hashFile,
  loadImageRegistry,
} from "../used-images.mjs";
import { repairGfmTildeRanges } from "./markdown-gfm-safe.mjs";

export const INTEGRITY_PHASES = ["draft", "publish"];

const INTERNAL_BLOG_LINK_RE = /]\(\/(en|ko)\/blog\/([a-z0-9][a-z0-9-]*)\)/gi;
const PREVIEW_URL_RE = /(?:draft|preview|localhost|127\.0\.0\.1)/i;
const EN_TEMPLATE_TITLE_RE = /^(How to|Stop|Why you|What to|When to)\b/i;

const INTEGRITY_EXEMPT_SLUGS = new Set([
  "welcome",
  "adsense-seo-checklist",
  "aipick-seo-precision-report",
]);
const MIN_RELATED_GUIDES_PUBLISH = 3;
const MAX_RELATED_GUIDES_PUBLISH = MAX_RELATED_GUIDE_LINKS;
const MIN_TAGS_PUBLISH = 3;
const TITLE_SIMILARITY_BLOCK = 0.82;

function isIntegrityExempt(slug, data) {
  if (INTEGRITY_EXEMPT_SLUGS.has(slug)) return true;
  if (data?.tags?.includes("internal")) return true;
  if (resolveContentProfile(data ?? {}) === "editorial") return true;
  return false;
}

function postsDir(root) {
  return path.join(root, "content", "posts");
}

function readLocaleFile(root, slug, locale) {
  const filePath = path.join(postsDir(root), slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { raw, data, content: content.trim(), filePath };
}

function writeLocaleFile(root, slug, locale, data, content) {
  const filePath = path.join(postsDir(root), slug, `${locale}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeContentRepair(filePath, data, content, fs, matter);
}

function normalizeTitleForCompare(title) {
  return String(title ?? "")
    .toLowerCase()
    .replace(/20\d{2}/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a, b) {
  const wa = new Set(normalizeTitleForCompare(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeTitleForCompare(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / Math.max(wa.size, wb.size);
}

function listH2Headings(body) {
  return (body.match(/^##\s+(.+)$/gm) ?? []).map((line) =>
    line.replace(/^##\s+/, "").trim(),
  );
}

function countRelatedGuideLinks(body) {
  const section = body.match(
    /##\s*(Related guides|관련 가이드)[\s\S]*?(?=\n##\s|$)/i,
  );
  if (!section) return 0;
  return (section[0].match(INTERNAL_BLOG_LINK_RE) ?? []).length;
}

function kstYear() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(new Date()),
  );
}

function fixStringTypos(str, locale = "en") {
  return repairContentPolicyText(str, locale).text;
}

function trimDescriptionToMetaLimit(text, max = MAX_DESCRIPTION_CHARS) {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed =
    lastSpace > Math.floor(max * 0.5) ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

/**
 * Auto-repair one locale file. Returns repairs applied.
 */
export function repairPostLocale(root, slug, locale) {
  const file = readLocaleFile(root, slug, locale);
  if (!file) return { repaired: false, repairs: [] };

  let { data, content } = file;
  const repairs = [];

  for (const key of ["title", "description", "coverImageAlt", "coverImageAltKo"]) {
    if (typeof data[key] === "string") {
      let value = data[key];
      if (key === "description" && value.length > MAX_DESCRIPTION_CHARS) {
        const trimmed = trimDescriptionToMetaLimit(value);
        if (trimmed !== value) {
          value = trimmed;
          repairs.push(
            `${slug}/${locale}.md: trimmed description to ${MAX_DESCRIPTION_CHARS} chars`,
          );
        }
      }
      const fixed = fixStringTypos(value, locale);
      if (fixed !== value) {
        data[key] = fixed;
        repairs.push(`${slug}/${locale}.md: policy/spelling fix in ${key}`);
      }
    }
  }

  const policyBody = repairContentPolicyText(content, locale);
  let body = policyBody.text;
  if (policyBody.repairs.length > 0) {
    repairs.push(
      ...policyBody.repairs.map((r) => `${slug}/${locale}.md: ${r}`),
    );
  }

  const gfmTilde = repairGfmTildeRanges(body);
  if (gfmTilde.changed) {
    body = gfmTilde.text;
    repairs.push(
      `${slug}/${locale}.md: replaced ${gfmTilde.count} ASCII tilde range(s) with en-dash (GFM strikethrough fix)`,
    );
  }

  const title = String(data.title ?? "").trim();
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && normalizeTitleForCompare(h1Match[1]) === normalizeTitleForCompare(title)) {
    body = body.replace(/^#\s+.+\n+/, "");
    repairs.push(`${slug}/${locale}.md: removed duplicate H1 matching frontmatter title`);
  }

  const wrongPrefix = locale === "en" ? "](/ko/blog/" : "](/en/blog/";
  const rightPrefix = locale === "en" ? "](/en/blog/" : "](/ko/blog/";
  if (body.includes(wrongPrefix)) {
    body = body.replaceAll(wrongPrefix, rightPrefix);
    repairs.push(`${slug}/${locale}.md: fixed internal links to ${locale} locale`);
  }

  if (PREVIEW_URL_RE.test(body)) {
    body = body.replace(/\[([^\]]*)\]\([^)]*(?:draft|preview|localhost)[^)]*\)/gi, "");
    repairs.push(`${slug}/${locale}.md: removed draft/preview URL links`);
  }

  const postIndex = loadPublishedPostIndex(root);
  if (postIndex.has(slug) && !isIntegrityExempt(slug, data)) {
    const related = repairRelatedGuidesInBody(body, locale, slug, postIndex);
    if (related.changed) {
      body = related.body;
      repairs.push(...related.repairs);
    }
  }

  if (locale === "en" && !isIntegrityExempt(slug, data)) {
    const expanded = expandEnglishBodyIfNeeded(body, slug, data, {
      includeDrafts: Boolean(data.draft),
    });
    if (expanded.changed) {
      body = expanded.body;
      repairs.push(...expanded.repairs);
    }
  }

  body = body.replace(/\n{4,}/g, "\n\n\n").trim();

  const repaired = repairs.length > 0 || body !== content;
  if (repaired) {
    writeLocaleFile(root, slug, locale, data, body);
  }

  return { repaired, repairs };
}

/**
 * Apply repairs to all locales for a post.
 */
export function repairPost(root, slug) {
  const allRepairs = [];
  for (const locale of ["en", "ko"]) {
    const { repairs } = repairPostLocale(root, slug, locale);
    allRepairs.push(...repairs);
  }
  return allRepairs;
}

function addError(bucket, message) {
  bucket.errors.push({ severity: "error", message });
}

function addWarning(bucket, message) {
  bucket.warnings.push({ severity: "warning", message });
}

function auditStructural(root, slug, locale, data, body, phase, bucket) {
  const label = `${slug}/${locale}.md`;
  const profile = resolveContentProfile(data);

  if (profile === "editorial") return;

  const h2s = listH2Headings(body);
  const uniqueH2 = new Set(h2s.map((h) => h.toLowerCase()));
  if (h2s.length !== uniqueH2.size) {
    addError(bucket, `${label}: duplicate H2 headings`);
  }

  const minH2ByProfile = {
    "buying-guide": 4,
    "head-to-head": 3,
    "scenario-guide": 4,
    explainer: 4,
    checklist: 4,
  };
  const minH2 = minH2ByProfile[profile] ?? 3;
  if (h2s.length < minH2) {
    addError(bucket, `${label}: need at least ${minH2} H2 sections (found ${h2s.length})`);
  }

  const relatedCount = countRelatedGuideLinks(body);
  if (relatedCount < MIN_RELATED_GUIDES_PUBLISH) {
    if (phase === "publish") {
      addError(
        bucket,
        `${label}: Related guides has ${relatedCount} links (need ≥${MIN_RELATED_GUIDES_PUBLISH})`,
      );
    } else {
      addWarning(
        bucket,
        `${label}: Related guides has ${relatedCount} links (need ≥${MIN_RELATED_GUIDES_PUBLISH} at publish)`,
      );
    }
  } else if (relatedCount > MAX_RELATED_GUIDES_PUBLISH) {
    addWarning(
      bucket,
      `${label}: Related guides has ${relatedCount} links (max ${MAX_RELATED_GUIDES_PUBLISH})`,
    );
  }

  const tags = data.tags ?? [];
  if (!Array.isArray(tags) || tags.length < MIN_TAGS_PUBLISH) {
    if (phase === "publish") {
      addError(
        bucket,
        `${label}: need at least ${MIN_TAGS_PUBLISH} tags (found ${tags?.length ?? 0})`,
      );
    } else {
      addWarning(
        bucket,
        `${label}: need at least ${MIN_TAGS_PUBLISH} tags (found ${tags?.length ?? 0})`,
      );
    }
  }

  if (locale === "en" && EN_TEMPLATE_TITLE_RE.test(String(data.title ?? ""))) {
    if (phase === "publish") {
      addError(
        bucket,
        `${label}: EN title starts with template hook (How to / Stop / …)`,
      );
    } else {
      addWarning(bucket, `${label}: EN title uses template hook — vary headline`);
    }
  }

  if (locale === "ko" && EN_TEMPLATE_TITLE_RE.test(String(data.title ?? ""))) {
    addError(bucket, `${label}: Korean file has English template title`);
  }

  if (locale === "ko" && HANGUL_LATIN_TYPO_RE.test(body)) {
    addError(
      bucket,
      `${label}: Korean body has hangul-latin mixed tokens (repair or fix manually)`,
    );
  }

  for (const issue of auditContentPolicyTitle(String(data.title ?? ""), locale, label)) {
    if (issue.severity === "error") {
      addError(bucket, issue.message);
    } else {
      addWarning(bucket, issue.message);
    }
  }

  for (const issue of auditContentPolicyText(body, locale, label)) {
    if (issue.severity === "error") {
      addError(bucket, issue.message);
    } else if (phase === "publish") {
      addWarning(bucket, issue.message);
    }
  }

  for (const issue of auditContentPolicyText(String(data.description ?? ""), locale, label)) {
    if (issue.severity === "error") {
      addError(bucket, issue.message);
    }
  }

  if (locale === "en" && /[\uAC00-\uD7A3]{4,}/.test(String(data.title ?? ""))) {
    addError(bucket, `${label}: English file title contains Korean text`);
  }

  if (profile === "buying-guide") {
    for (const pattern of FORMULAIC_TITLE_PATTERNS) {
      if (pattern.test(String(data.title ?? ""))) {
        addError(bucket, `${label}: formulaic buying-guide title`);
        break;
      }
    }
  }

  if (profile === "checklist" && phase === "publish") {
    const items = body.match(/^\d+\.\s+/gm) ?? [];
    const withWhy = (body.match(/\*\*(이유|Why it matters|Why):?\*\*/gi) ?? []).length;
    if (items.length >= 7 && withWhy < 5) {
      addError(bucket, `${label}: checklist items missing **이유** / **Why** blocks`);
    }
  }

  if (!data.liveData && /\{\{today/.test(body)) {
    if (phase === "publish") {
      addError(bucket, `${label}: liveData false but {{today}} placeholder remains`);
    } else {
      addWarning(bucket, `${label}: liveData false but {{today}} placeholder present`);
    }
  }

  if (/20\d{2}/.test(String(data.title ?? ""))) {
    if (phase === "publish") {
      addError(bucket, `${label}: title must not contain a calendar year (20xx)`);
    } else {
      addWarning(bucket, `${label}: title contains year — remove before publish`);
    }
  }

  const slugYear = slug.match(/20(\d{2})/);
  const currentYear = kstYear();
  if (slugYear && Number(`20${slugYear[1]}`) < currentYear - 1) {
    addWarning(bucket, `${label}: slug year looks stale (KST ${currentYear})`);
  }

  for (const match of body.matchAll(INTERNAL_BLOG_LINK_RE)) {
    const linkLocale = match[1];
    if (linkLocale !== locale) {
      addError(bucket, `${label}: internal link uses /${linkLocale}/ in ${locale} file`);
    }
  }
}

function auditPostLevel(root, slug, phase, bucket, state) {
  const enFile = readLocaleFile(root, slug, "en");
  if (!enFile) {
    addError(bucket, `${slug}/en.md: missing file`);
    return;
  }

  const profile = resolveContentProfile(enFile.data);
  const publishedSlugs = listPublishedSlugs(root);
  if (!CONTENT_PROFILES.includes(profile) && profile !== "editorial") {
    bucket.errors.push({
      severity: "error",
      message: `${slug}: invalid contentProfile "${profile}"`,
    });
  }

  const registry = loadImageRegistry();
  const coverPath = enFile.data.coverImage
    ? path.join(root, "public", String(enFile.data.coverImage).replace(/^\//, ""))
    : null;
  const hash = coverPath && fs.existsSync(coverPath) ? hashFile(coverPath) : null;
  const key =
    enFile.data.coverImageProvider && enFile.data.coverImageAssetId
      ? assetKey(enFile.data.coverImageProvider, enFile.data.coverImageAssetId)
      : null;

  const usedByOther = registry.entries.some(
    (e) =>
      e.slug !== slug &&
      ((hash && e.hash === hash) ||
        (key && e.assetKey === key) ||
        (enFile.data.coverImageSourceUrl &&
          e.url === String(enFile.data.coverImageSourceUrl).split("?")[0].toLowerCase())),
  );

  if (usedByOther) {
    addError(bucket, `${slug}: cover image already used on another post (duplicate hero)`);
  }

  const topicDup = validateReplenishTopicUnique(slug, root);
  if (!topicDup.ok) {
    addError(bucket, topicDup.reason);
  }

  if (phase === "publish" && state) {
    const topic = inferPostTopic(slug, enFile.data);
    const violation = wouldViolateTopicDiversity(
      { id: topic.id, category: topic.category, topicCluster: topic.cluster },
      state.topicHistory ?? [],
    );
    if (violation.blocked) {
      addError(bucket, `${slug}: topic diversity — ${violation.reason}`);
    }

    const formatHistory = state.formatHistory ?? [];
    const last2 = formatHistory.slice(-2);
    if (
      last2.length === 2 &&
      last2[0] === profile &&
      last2[1] === profile &&
      CONTENT_PROFILES.includes(profile)
    ) {
      addError(bucket, `${slug}: same contentProfile "${profile}" would be 3 in a row`);
    }
  }

  for (const other of publishedSlugs) {
    if (other === slug) continue;
    const otherFile = readLocaleFile(root, other, "en");
    if (!otherFile) continue;
    const sim = titleSimilarity(enFile.data.title, otherFile.data.title);
    if (sim >= TITLE_SIMILARITY_BLOCK) {
      if (phase === "publish") {
        addError(
          bucket,
          `${slug}: title too similar to published "${other}" (${Math.round(sim * 100)}%)`,
        );
      } else {
        addWarning(
          bucket,
          `${slug}: title similar to "${other}" (${Math.round(sim * 100)}%)`,
        );
      }
      break;
    }
  }
}

/**
 * Verify post integrity without writing repairs.
 */
export function verifyPostIntegrity(root, slug, options = {}) {
  const phase = options.phase ?? "publish";
  const state = options.state ?? null;
  const priorRepairs = options.repairs ?? [];

  const enPeek = readLocaleFile(root, slug, "en");
  const koPeek = readLocaleFile(root, slug, "ko");
  const peekData = enPeek?.data ?? koPeek?.data ?? {};
  if (isIntegrityExempt(slug, peekData)) {
    return {
      ok: true,
      phase,
      slug,
      errors: [],
      warnings: [],
      repairs: [...priorRepairs],
      exempt: true,
    };
  }

  const bucket = { errors: [], warnings: [], repairs: [...priorRepairs] };

  auditPostLevel(root, slug, phase, bucket, state);

  for (const locale of ["en", "ko"]) {
    const file = readLocaleFile(root, slug, locale);
    if (!file) {
      bucket.errors.push({
        severity: "error",
        message: `${slug}/${locale}.md: missing file`,
      });
      continue;
    }
    auditStructural(root, slug, locale, file.data, file.content, phase, bucket);
  }

  const qualityIssues = auditPostForPublish(root, slug);
  for (const message of qualityIssues) {
    addError(bucket, message);
  }

  const blockWarnings = phase === "publish";
  const ok =
    bucket.errors.length === 0 && (!blockWarnings || bucket.warnings.length === 0);
  return { ok, phase, slug, ...bucket };
}

/**
 * Repair (optional) then verify. Returns result; does not throw.
 */
export function runPublishIntegrityGate(root, slug, options = {}) {
  const phase = options.phase ?? "publish";
  const applyRepair = options.applyRepair !== false;
  const state = options.state ?? null;

  const repairs = applyRepair ? repairPost(root, slug) : [];
  const result = verifyPostIntegrity(root, slug, { phase, state, repairs });

  if (!result.ok) {
    console.error(`❌ publish blocked — integrity gate (${phase}): ${slug}`);
    for (const e of result.errors) {
      console.error(`  ERROR: ${e.message}`);
    }
  } else if (result.warnings.length > 0) {
    console.warn(`⚠ integrity warnings (${phase}): ${slug}`);
    for (const w of result.warnings) {
      console.warn(`  WARN: ${w.message}`);
    }
  } else {
    console.log(`✅ integrity gate passed (${phase}): ${slug}`);
  }

  if (result.repairs.length > 0) {
    console.log(`  auto-repaired: ${result.repairs.length} item(s)`);
    for (const r of result.repairs) {
      console.log(`    · ${r}`);
    }
  }

  return result;
}

export function formatIntegrityReport(result) {
  const lines = [];
  lines.push(
    result.ok
      ? `OK [${result.phase}] ${result.slug}`
      : `BLOCKED [${result.phase}] ${result.slug}`,
  );
  for (const e of result.errors) lines.push(`  ERROR: ${e.message}`);
  for (const w of result.warnings) lines.push(`  WARN: ${w.message}`);
  for (const r of result.repairs) lines.push(`  FIX: ${r}`);
  return lines.join("\n");
}

export function integrityIssuesFlat(result) {
  const errors = result.errors.map((e) => e.message);
  if (result.phase === "publish") {
    return [...errors, ...result.warnings.map((w) => w.message)];
  }
  return errors;
}
