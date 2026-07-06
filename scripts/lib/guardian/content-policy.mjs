/**
 * Pipeline Guardian — Google/AdSense content policy (do not import outside guardian/index).
 * Forbidden phrases, spelling repairs.
 * Priority: policy compliance > legacy formatting rules.
 */

import {
  FORMULAIC_TITLE_PATTERNS,
  MISLEADING_SOURCE_PATTERNS,
} from "./editorial-standards.mjs";

/** AdSense / script / ad-placeholder patterns (Google policy). */
export const FORBIDDEN_AD_PATTERNS = [
  /<!--\s*ad-break\s*-->/gi,
  /adsense/gi,
  /googlesyndication/gi,
  /placeholder.*ad/gi,
  /광고\s*영역/gi,
  /\[sponsored\]/gi,
  /\[광고\]/gi,
];

/**
 * Phrases that violate Google helpful-content / misleading-claims policy.
 * autoFix: safe to replace or remove in automation.
 */
export const FORBIDDEN_PHRASES = [
  {
    id: "guaranteed-rank-en",
    pattern: /guaranteed?\s*(#?1|top|first)\s*(rank|ranking|position|spot)/gi,
    replacement: "competitive search visibility",
    autoFix: true,
    policy: "google-misleading",
  },
  {
    id: "guaranteed-rank-ko",
    pattern: /구글\s*(최상단|1위|상위)\s*(보장|확정|달성)/gi,
    replacement: "검색 노출 개선",
    autoFix: true,
    policy: "google-misleading",
  },
  {
    id: "clickbait-en",
    pattern: /\b(you won't believe|shocking truth|doctors hate|one weird trick)\b/gi,
    replacement: "",
    autoFix: true,
    policy: "google-clickbait",
  },
  {
    id: "clickbait-ko",
    pattern: /(충격|경악|절대\s*후회|이것만\s*알면)/gi,
    replacement: "",
    autoFix: false,
    policy: "google-clickbait",
  },
  {
    id: "fake-urgency",
    pattern: /\b(buy now before it's gone|limited time only|act fast)\b/gi,
    replacement: "check current availability",
    autoFix: true,
    policy: "google-cta",
  },
  {
    id: "affiliate-spam",
    pattern: /\b(click here to buy now|best deal ever|must buy today)\b/gi,
    replacement: "see official listings",
    autoFix: true,
    policy: "google-cta",
  },
  {
    id: "private-feed-claim",
    pattern: /private commerce feeds?/gi,
    replacement: "public manufacturer listings",
    autoFix: true,
    policy: "google-source",
  },
  {
    id: "undisclosed-db",
    pattern: /undisclosed seller databases?/gi,
    replacement: "public review platforms",
    autoFix: true,
    policy: "google-source",
  },
];

/** Safe spelling / typo repairs (not a full spellchecker). */
export const EN_TYPO_FIXES = [
  [/\brecieve\b/gi, "receive"],
  [/\bseperate\b/gi, "separate"],
  [/\boccured\b/gi, "occurred"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bbluetooh\b/gi, "bluetooth"],
  [/\bairconditon\b/gi, "air conditioner"],
  [/\bperformence\b/gi, "performance"],
  [/\bcomparsion\b/gi, "comparison"],
  [/\bwaranty\b/gi, "warranty"],
];

export const KO_TYPO_FIXES = [
  [/백그ra운드/gi, "백그라운드"],
  [/독찴적/g, "독창적"],
  [/추천해요요/g, "추천해요"],
  [/있습니다다/g, "있습니다"],
  [/됩니다다/g, "됩니다"],
];

/** CJK ideographs (Hanja) — Korean posts must use Hangul only. */
export const CJK_HANJA_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

/** Known Hanja → Hangul auto-repairs (safe, word-level). */
export const HANJA_AUTO_FIXES = [
  [/誇大/g, "과대"],
  [/獨創/g, "독창"],
  [/誇張/g, "과장"],
  [/誤字/g, "오자"],
  [/比較/g, "비교"],
  [/參考/g, "참고"],
  [/價格/g, "가격"],
  [/製品/g, "제품"],
  [/購買/g, "구매"],
  [/推薦/g, "추천"],
  [/注意/g, "주의"],
  [/方法/g, "방법"],
  [/品質/g, "품질"],
  [/保證/g, "보장"],
];

export const HANGUL_LATIN_TYPO_RE =
  /[\uAC00-\uD7A3]{2,}[a-zA-Z]{2,5}[\uAC00-\uD7A3]{2,}/g;

function applyHanjaFixes(text) {
  let out = text;
  const repairs = [];
  for (const [re, replacement] of HANJA_AUTO_FIXES) {
    if (re.test(out)) {
      out = out.replace(re, replacement);
      repairs.push(`hanja fix (${re})`);
      re.lastIndex = 0;
    }
  }
  return { text: out, repairs };
}

function applyTypoFixes(text, fixes) {
  let out = text;
  const applied = [];
  for (const [re, replacement] of fixes) {
    if (re.test(out)) {
      out = out.replace(re, replacement);
      applied.push(String(re));
    }
  }
  return { text: out, applied };
}

function applyForbiddenPhraseFixes(text) {
  let out = text;
  const repairs = [];
  for (const rule of FORBIDDEN_PHRASES) {
    if (!rule.autoFix || !rule.pattern.test(out)) continue;
    const before = out;
    out = out.replace(rule.pattern, rule.replacement ?? "");
    if (out !== before) {
      repairs.push(`forbidden phrase (${rule.id})`);
      rule.pattern.lastIndex = 0;
    }
  }
  return { text: out, repairs };
}

function removeForbiddenAdPatterns(text) {
  let out = text;
  const repairs = [];
  for (const re of FORBIDDEN_AD_PATTERNS) {
    if (re.test(out)) {
      out = out.replace(re, "");
      repairs.push(`removed ad/forbidden pattern ${re}`);
    }
  }
  return { text: out.trim(), repairs };
}

/**
 * Auto-repair policy + spelling on a text blob.
 */
export function repairContentPolicyText(text, locale = "en") {
  let out = String(text ?? "");
  const repairs = [];

  out = out
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const ad = removeForbiddenAdPatterns(out);
  out = ad.text;
  repairs.push(...ad.repairs);

  const phrases = applyForbiddenPhraseFixes(out);
  out = phrases.text;
  repairs.push(...phrases.repairs);

  const typos = applyTypoFixes(
    out,
    locale === "ko" ? KO_TYPO_FIXES : EN_TYPO_FIXES,
  );
  out = typos.text;
  if (typos.applied.length > 0) {
    repairs.push(`typo fixes (${typos.applied.length})`);
  }

  if (locale === "ko") {
    const hanja = applyHanjaFixes(out);
    out = hanja.text;
    if (hanja.repairs.length > 0) {
      repairs.push(`hanja fixes (${hanja.repairs.length})`);
    }

    const koTypos = applyTypoFixes(out, KO_TYPO_FIXES);
    if (koTypos.applied.length > 0) {
      out = koTypos.text;
      repairs.push(`typo fixes ko (${koTypos.applied.length})`);
    }
  }

  return { text: out, repairs };
}

/**
 * Audit text for policy violations (after repairs).
 */
export function auditContentPolicyText(text, locale = "en", label = "") {
  const issues = [];
  const body = String(text ?? "");
  const prefix = label ? `${label}: ` : "";

  for (const re of FORBIDDEN_AD_PATTERNS) {
    if (re.test(body)) {
      issues.push({
        code: "forbidden-ad",
        message: `${prefix}forbidden ad/AdSense pattern (${re})`,
        severity: "error",
        policy: "google-adsense",
      });
      re.lastIndex = 0;
    }
  }

  for (const rule of FORBIDDEN_PHRASES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(body)) {
      issues.push({
        code: rule.id,
        message: `${prefix}forbidden phrase — ${rule.policy}`,
        severity: rule.autoFix ? "warning" : "error",
        policy: rule.policy,
        autoFixable: rule.autoFix,
      });
    }
  }

  for (const re of MISLEADING_SOURCE_PATTERNS) {
    if (re.test(body)) {
      issues.push({
        code: "misleading-source",
        message: `${prefix}misleading API/database claim (Google E-E-A-T)`,
        severity: "error",
        policy: "google-source",
        autoFixable: false,
      });
      re.lastIndex = 0;
    }
  }

  if (locale === "ko" && HANGUL_LATIN_TYPO_RE.test(body)) {
    issues.push({
      code: "hangul-latin-typo",
      message: `${prefix}Korean body has hangul-latin mixed tokens`,
      severity: "error",
      policy: "spelling",
      autoFixable: true,
    });
  }

  if (locale === "ko" && CJK_HANJA_RE.test(body)) {
    const sample = body.match(CJK_HANJA_RE)?.[0] ?? "";
    issues.push({
      code: "hanja-forbidden",
      message: `${prefix}Korean content must not include Hanja/CJK ideographs (found "${sample}") — use Hangul`,
      severity: "error",
      policy: "korean-style",
      autoFixable: false,
    });
  }

  return issues;
}

export function auditContentPolicyTitle(title, locale = "en", label = "") {
  const issues = auditContentPolicyText(title, locale, label);
  const prefix = label ? `${label}: ` : "";

  for (const pattern of FORMULAIC_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      issues.push({
        code: "formulaic-title",
        message: `${prefix}formulaic title pattern`,
        severity: "error",
        policy: "google-helpful",
        autoFixable: false,
      });
      break;
    }
  }

  return issues;
}

export function sitePostUrls(slug, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop") {
  return {
    en: `${siteUrl}/en/blog/${slug}`,
    ko: `${siteUrl}/ko/blog/${slug}`,
    admin: `${siteUrl}/admin`,
    previewEn: `${siteUrl}/admin/preview/${slug}?locale=en`,
    previewKo: `${siteUrl}/admin/preview/${slug}?locale=ko`,
  };
}
