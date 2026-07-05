/**
 * SEO audit analyzers — read-only scan of published posts (never mutates live content).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { listPublishedSlugs } from "../../lib/content-quality.mjs";
import {
  auditContentPolicyText,
  auditContentPolicyTitle,
} from "../../lib/guardian/content-policy.mjs";
import { verifyPostIntegrity } from "../../lib/guardian/publish-integrity.mjs";
import { SEO_AUDIT_SLUG } from "./constants.mjs";

const POSTS_DIR = "content/posts";

function extractH2s(body) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

function wordTokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function keywordDensity(body, topN = 5) {
  const tokens = wordTokens(body.replace(/^#+\s.+$/gm, ""));
  const stop = new Set([
    "the", "and", "for", "with", "this", "that", "from", "are", "was", "have",
    "your", "you", "not", "but", "can", "will", "our", "how", "what", "when",
    "및", "에서", "으로", "하는", "있는", "대한", "통해", "또는", "이번", "기준",
  ]);
  const freq = new Map();
  for (const t of tokens) {
    if (stop.has(t) || t.length < 2) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const total = tokens.length || 1;
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term, count]) => ({
      term,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }));
}

function profileStructureScore(profile, h2s, body) {
  let score = 0;
  const h2Text = h2s.join(" ").toLowerCase();
  const bodyLower = body.toLowerCase();

  if (h2s.length >= 4) score += 25;
  else if (h2s.length >= 3) score += 15;

  if (/methodology|방법론/.test(h2Text) || /methodology|방법론/.test(bodyLower)) {
    score += 20;
  }
  if (/faq|자주 묻는/.test(h2Text)) score += 15;
  if (/overview|개요|editorial/.test(h2Text)) score += 10;

  if (profile === "checklist" && /checklist|체크/.test(h2Text)) score += 15;
  if (profile === "head-to-head" && /vs|comparison|비교|대결/.test(bodyLower)) {
    score += 10;
  }
  if (profile === "scenario-guide" && /scenario|시나리오/.test(bodyLower)) {
    score += 10;
  }

  return Math.min(100, score);
}

function jsonLdReadiness(data, body, root, slug) {
  const issues = [];
  let score = 0;

  if (data.title) score += 15;
  else issues.push("title missing");

  const desc = String(data.description ?? "");
  if (desc.length >= 50 && desc.length <= 160) score += 20;
  else issues.push(`description length ${desc.length} (want 50–160)`);

  if (data.date) score += 10;

  const faqMatch = body.match(/##\s*(FAQ|자주 묻는 질문)/i);
  if (faqMatch) {
    const faqSection = body.slice(body.indexOf(faqMatch[0]));
    const qCount = (faqSection.match(/^###\s+/gm) ?? []).length;
    if (qCount >= 3) score += 25;
    else issues.push(`FAQ H3 count ${qCount} (< 3)`);
  } else {
    issues.push("FAQ section missing (FAQPage schema)");
  }

  const cover = data.coverImage
    ? path.join(root, "public", String(data.coverImage))
    : null;
  if (cover && fs.existsSync(cover)) score += 15;
  else issues.push("cover image missing");

  if (data.contentProfile === "checklist") {
    const steps = (body.match(/^\d+\.\s+/gm) ?? []).length;
    if (steps >= 5) score += 15;
    else issues.push(`checklist steps ${steps} (< 5 for HowTo)`);
  } else {
    score += 10;
  }

  return { score: Math.min(100, score), issues };
}

function analyzePost(root, slug, locale) {
  const filePath = path.join(root, POSTS_DIR, slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  if (data.draft) return null;

  const h2s = extractH2s(content);
  const profile = data.contentProfile ?? "buying-guide";
  const structureScore = profileStructureScore(profile, h2s, content);
  const jsonLd = jsonLdReadiness(data, content, root, slug);
  const policyBodyIssues = auditContentPolicyText(content, locale);
  const policyTitleIssues = auditContentPolicyTitle(String(data.title ?? ""), locale);
  const density = keywordDensity(content);

  const gate = verifyPostIntegrity(root, slug, { phase: "publish", repairs: [] });

  const riskIssues = [
    ...policyBodyIssues.map((i) => i.message),
    ...policyTitleIssues.map((i) => i.message),
    ...(gate.errors ?? []).map((e) => e.message),
    ...(gate.warnings ?? []).map((w) => w.message),
  ];

  const riskScore = Math.max(0, 100 - riskIssues.length * 8);

  return {
    slug,
    locale,
    profile,
    title: String(data.title ?? slug),
    structureScore,
    jsonLdScore: jsonLd.score,
    jsonLdIssues: jsonLd.issues,
    riskScore,
    riskIssues: riskIssues.slice(0, 5),
    h2Count: h2s.length,
    keywordDensity: density,
  };
}

/**
 * @param {string} [root]
 */
export function runSeoAuditAnalysis(root = process.cwd()) {
  const slugs = [...listPublishedSlugs(root)].filter((s) => s !== SEO_AUDIT_SLUG);
  const posts = [];

  for (const slug of slugs) {
    for (const locale of ["en", "ko"]) {
      const row = analyzePost(root, slug, locale);
      if (row) posts.push(row);
    }
  }

  const enPosts = posts.filter((p) => p.locale === "en");
  const avgStructure =
    enPosts.length === 0
      ? 0
      : Math.round(
          enPosts.reduce((s, p) => s + p.structureScore, 0) / enPosts.length,
        );
  const avgJsonLd =
    enPosts.length === 0
      ? 0
      : Math.round(enPosts.reduce((s, p) => s + p.jsonLdScore, 0) / enPosts.length);
  const avgRisk =
    enPosts.length === 0
      ? 0
      : Math.round(enPosts.reduce((s, p) => s + p.riskScore, 0) / enPosts.length);

  const jsonLdPass = enPosts.filter((p) => p.jsonLdIssues.length === 0).length;
  const jsonLdRatio =
    enPosts.length === 0 ? 0 : Math.round((jsonLdPass / enPosts.length) * 100);

  const atRisk = posts
    .filter((p) => p.riskIssues.length > 0 || p.structureScore < 60)
    .sort((a, b) => a.structureScore - b.structureScore)
    .slice(0, 12);

  const topStructure = [...enPosts]
    .sort((a, b) => b.structureScore - a.structureScore)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    publishedSlugCount: slugs.length,
    localeScanCount: posts.length,
    averages: {
      structureIntent: avgStructure,
      jsonLdReadiness: avgJsonLd,
      qualityDefense: avgRisk,
    },
    jsonLdCoveragePct: jsonLdRatio,
    posts,
    atRisk,
    topStructure,
  };
}
