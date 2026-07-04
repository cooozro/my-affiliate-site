/**
 * SERP benchmark — provider-backed search, cache, outline synthesis, originality checks.
 */

import fs from "fs";
import path from "path";
import { loadEnvFile } from "../load-env.mjs";
import { kstDateString } from "../../automation/state.mjs";
import { getSerpProvider, getSerpProviderName, isSerpConfigured } from "./serp-providers.mjs";
import {
  enhanceBenchmarkKeyword,
  filterAndRankSerpItems,
  summarizeSerpDomains,
} from "./serp-filters.mjs";

export const SERP_DAILY_QUOTA = 100;
export const MAX_SERP_PAGES = 3;
export const RESULTS_PER_PAGE = 10;
export const H2_SIMILARITY_MAX = 0.7;
export const SHINGLE_OVERLAP_MAX = 0.15;

const CACHE_DIR = path.join(process.cwd(), "data", "automation", "serp-cache");
const QUOTA_PATH = path.join(process.cwd(), "data", "automation", "serp-quota.json");
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const HEADING_FETCH_TIMEOUT_MS = 8000;
const MAX_HEADING_FETCHES = 5;

const TONE_SECTION_PREFIX = {
  "question-led": "What you need to know:",
  "case-study": "Real-world scenario:",
  "data-driven": "By the numbers:",
  "scenario-first": "If your situation is:",
  "myth-bust": "Myth vs fact:",
  "checklist-hook": "Before you decide:",
};

function ensureDirs() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function slugifyKeyword(keyword) {
  return String(keyword)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "keyword";
}

export function getSearchCredentials() {
  loadEnvFile();
  if (!isSerpConfigured()) return null;
  return {
    provider: getSerpProviderName(),
    apiKey: process.env.SERPER_API_KEY?.trim(),
  };
}

export { getSerpProviderName, isSerpConfigured } from "./serp-providers.mjs";
export { enhanceBenchmarkKeyword, filterAndRankSerpItems, summarizeSerpDomains } from "./serp-filters.mjs";

function loadQuotaState() {
  const today = kstDateString();
  if (!fs.existsSync(QUOTA_PATH)) {
    return { dateKst: today, count: 0 };
  }
  try {
    const data = JSON.parse(fs.readFileSync(QUOTA_PATH, "utf8"));
    if (data.dateKst !== today) {
      return { dateKst: today, count: 0 };
    }
    return { dateKst: today, count: Number(data.count) || 0 };
  } catch {
    return { dateKst: today, count: 0 };
  }
}

function saveQuotaState(state) {
  fs.mkdirSync(path.dirname(QUOTA_PATH), { recursive: true });
  fs.writeFileSync(QUOTA_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function recordSerpQueryUse(count = 1) {
  const state = loadQuotaState();
  state.count += count;
  saveQuotaState(state);
  return state;
}

export function getSerpQuotaRemaining() {
  const state = loadQuotaState();
  return Math.max(0, SERP_DAILY_QUOTA - state.count);
}

export function readSerpCache(keyword) {
  ensureDirs();
  const file = path.join(CACHE_DIR, `${slugifyKeyword(keyword)}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function writeSerpCache(keyword, payload) {
  ensureDirs();
  const file = path.join(CACHE_DIR, `${slugifyKeyword(keyword)}.json`);
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return file;
}

function isCacheFresh(cached) {
  if (!cached?.fetchedAt) return false;
  return Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MAX_AGE_MS;
}

export function keywordFromTopic(topic) {
  if (topic.searchKeyword?.trim()) return topic.searchKeyword.trim();
  if (topic.imageSearchKeywords?.[0]) return topic.imageSearchKeywords[0];
  const angle = String(topic.angle ?? topic.id ?? "product");
  const year = new Date().getFullYear();
  return `${year} ${angle.split(":")[0].trim()} buying guide`;
}

export async function fetchSerpPage(keyword, { page = 1 } = {}) {
  if (!isSerpConfigured()) {
    throw new Error(`SERP provider "${getSerpProviderName()}" is not configured (SERPER_API_KEY missing)`);
  }

  if (getSerpQuotaRemaining() <= 0) {
    throw new Error(`SERP daily quota exhausted (${SERP_DAILY_QUOTA}/day KST)`);
  }

  const provider = getSerpProvider();
  const items = await provider.fetchPage(keyword, { page });
  recordSerpQueryUse(1);
  return items;
}

export async function fetchSerpResults(keyword, { maxPages = MAX_SERP_PAGES } = {}) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await fetchSerpPage(keyword, { page });
    items.push(...batch);
    if (batch.length < RESULTS_PER_PAGE) break;
  }
  return items;
}

function stripHtml(text) {
  return String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadingsFromHtml(html) {
  const h2 = [];
  const h3 = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;

  let match;
  while ((match = h2Re.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length >= 4 && text.length <= 120) h2.push(text);
  }
  while ((match = h3Re.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length >= 4 && text.length <= 120) h3.push(text);
  }

  return { h2: h2.slice(0, 12), h3: h3.slice(0, 16) };
}

export async function fetchPageHeadings(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEADING_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AIPickBenchmarkBot/1.0 (+https://www.aipick.shop)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!response.ok) return { h2: [], h3: [] };
    const html = await response.text();
    return extractHeadingsFromHtml(html.slice(0, 500_000));
  } catch {
    return { h2: [], h3: [] };
  } finally {
    clearTimeout(timer);
  }
}

function headingsFromSerpTitles(items) {
  const h2 = [];
  for (const item of items.slice(0, 10)) {
    const title = String(item.title ?? "").trim();
    if (title.length >= 8) h2.push(title.slice(0, 100));
  }
  return h2;
}

export async function collectSourceHeadings(serpItems) {
  const sources = [];
  const seenHosts = new Set();

  for (const item of serpItems) {
    if (sources.length >= MAX_HEADING_FETCHES) break;
    const url = item.link;
    if (!url) continue;

    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    if (seenHosts.has(host)) continue;
    seenHosts.add(host);

    const headings = await fetchPageHeadings(url);
    sources.push({
      url,
      title: item.title ?? "",
      snippet: item.snippet ?? "",
      h2: headings.h2,
      h3: headings.h3,
    });
  }

  if (sources.every((s) => s.h2.length === 0)) {
    const fallbackH2 = headingsFromSerpTitles(serpItems);
    if (fallbackH2.length > 0) {
      sources.unshift({
        url: serpItems[0]?.link ?? "",
        title: serpItems[0]?.title ?? "",
        snippet: serpItems[0]?.snippet ?? "",
        h2: fallbackH2,
        h3: [],
      });
    }
  }

  return sources;
}

function normalizeTokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function jaccardTokenSimilarity(a, b) {
  const sa = new Set(normalizeTokens(a));
  const sb = new Set(normalizeTokens(b));
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const token of sa) {
    if (sb.has(token)) inter += 1;
  }
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

export function h2SequenceSimilarity(outlineH2s, sourceH2s) {
  if (!outlineH2s.length || !sourceH2s.length) return 0;

  let total = 0;
  for (const outline of outlineH2s) {
    let best = 0;
    for (const source of sourceH2s) {
      best = Math.max(best, jaccardTokenSimilarity(outline, source));
    }
    total += best;
  }
  return total / outlineH2s.length;
}

export function buildShingles(text, size = 5) {
  const tokens = normalizeTokens(text);
  const shingles = new Set();
  for (let i = 0; i <= tokens.length - size; i += 1) {
    shingles.add(tokens.slice(i, i + size).join(" "));
  }
  return shingles;
}

export function shingleOverlapRatio(text, referenceTexts, size = 5) {
  const target = buildShingles(text, size);
  if (target.size === 0) return 0;

  const reference = new Set();
  for (const ref of referenceTexts) {
    for (const shingle of buildShingles(ref, size)) {
      reference.add(shingle);
    }
  }
  if (reference.size === 0) return 0;

  let overlap = 0;
  for (const shingle of target) {
    if (reference.has(shingle)) overlap += 1;
  }
  return overlap / target.size;
}

const ABSTRACT_REPLACEMENTS = [
  [/buying guide/gi, "purchase decision guide"],
  [/best\b/gi, "standout"],
  [/top\s*(\d+)/gi, "shortlist of $1"],
  [/vs\.?/gi, "compared with"],
  [/review/gi, "hands-on assessment"],
  [/how to/gi, "steps to"],
  [/complete guide/gi, "practical walkthrough"],
  [/ultimate/gi, "focused"],
  [/구매/g, "선택"],
  [/가이드/g, "안내"],
  [/추천/g, "후보"],
  [/비교/g, "대조"],
];

function abstractHeading(heading, toneVariant, index) {
  let text = String(heading).trim();
  for (const [pattern, replacement] of ABSTRACT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  const prefix = TONE_SECTION_PREFIX[toneVariant];
  if (prefix && index === 0) {
    return `${prefix} ${text}`.slice(0, 120);
  }

  if (index % 2 === 1) {
    return `Key factors: ${text}`.slice(0, 120);
  }
  return text.slice(0, 120);
}

function uniqueHeadings(headings) {
  const seen = new Set();
  const out = [];
  for (const h of headings) {
    const key = normalizeTokens(h).join(" ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

export function synthesizeUniqueOutline({
  sourceHeadings,
  contentProfile,
  toneVariant,
  topicAngle,
}) {
  const pooledH2 = uniqueHeadings(
    sourceHeadings.flatMap((s) => s.h2).filter(Boolean),
  );
  const pooledH3 = uniqueHeadings(
    sourceHeadings.flatMap((s) => s.h3).filter(Boolean),
  );

  const selectedH2 = pooledH2.slice(0, 6);
  if (selectedH2.length < 3) {
    selectedH2.push(
      `Editorial overview: ${String(topicAngle).split(":")[0].trim()}`,
      "Analysis methodology",
      "What to verify before you buy",
      "Related guides",
    );
  }

  const sections = selectedH2.slice(0, 6).map((h2, index) => {
    const abstractH2 = abstractHeading(h2, toneVariant, index);
    const h3Pool = pooledH3
      .filter((h3) => jaccardTokenSimilarity(h3, abstractH2) < 0.5)
      .slice(index * 2, index * 2 + 2)
      .map((h3, subIndex) => abstractHeading(h3, toneVariant, index + subIndex + 1));

    return {
      h2: abstractH2,
      h3: h3Pool.length > 0 ? h3Pool : undefined,
    };
  });

  if (!sections.some((s) => /methodology|방법론|method/i.test(s.h2))) {
    sections.splice(Math.min(2, sections.length), 0, {
      h2: "Analysis methodology",
      h3: ["Sources we use", "How we compare models"],
    });
  }

  if (contentProfile === "checklist") {
    sections.unshift({
      h2: "Pre-purchase checklist",
      h3: ["Must-check specs", "Red flags to skip"],
    });
  }

  return {
    contentProfile,
    toneVariant,
    introAngle: `${toneVariant} framing for ${topicAngle}`,
    conclusionAngle: "Actionable next steps without hype",
    sections: sections.slice(0, 7),
  };
}

export function validateOutlineOriginality(outline, sourceHeadings) {
  const outlineH2s = outline.sections.map((s) => s.h2);
  const sourceH2s = sourceHeadings.flatMap((s) => s.h2);
  const sourceText = sourceHeadings
    .map((s) => [s.title, s.snippet, ...s.h2, ...s.h3].join(" "))
    .join(" ");

  const outlineText = outline.sections
    .flatMap((s) => [s.h2, ...(s.h3 ?? [])])
    .join(" ");

  const h2Similarity = h2SequenceSimilarity(outlineH2s, sourceH2s);
  const shingleOverlap = shingleOverlapRatio(outlineText, [sourceText]);

  const ok =
    outlineH2s.length >= 4 &&
    h2Similarity <= H2_SIMILARITY_MAX &&
    shingleOverlap <= SHINGLE_OVERLAP_MAX;

  return {
    ok,
    h2Similarity,
    shingleOverlap,
    reasons: ok
      ? []
      : [
          ...(outlineH2s.length < 4 ? ["outline needs at least 4 H2 sections"] : []),
          ...(h2Similarity > H2_SIMILARITY_MAX
            ? [`H2 sequence similarity ${h2Similarity.toFixed(2)} > ${H2_SIMILARITY_MAX}`]
            : []),
          ...(shingleOverlap > SHINGLE_OVERLAP_MAX
            ? [`shingle overlap ${shingleOverlap.toFixed(2)} > ${SHINGLE_OVERLAP_MAX}`]
            : []),
        ],
  };
}

export async function getSerpData(keyword, { forceRefresh = false, maxPages = 1 } = {}) {
  const cached = readSerpCache(keyword);
  if (!forceRefresh && cached && isCacheFresh(cached)) {
    return { ...cached, fromCache: true };
  }

  const rawItems = await fetchSerpResults(keyword, { maxPages });
  const { items, stats } = filterAndRankSerpItems(rawItems);
  const sourceHeadings = await collectSourceHeadings(items);

  const payload = {
    keyword,
    provider: getSerpProviderName(),
    fetchedAt: new Date().toISOString(),
    queriesUsed: Math.min(maxPages, Math.ceil(rawItems.length / RESULTS_PER_PAGE) || 1),
    rawItemCount: rawItems.length,
    itemCount: items.length,
    filterStats: stats,
    domains: summarizeSerpDomains(items),
    items: items.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
    })),
    sourceHeadings,
  };

  payload.cachePath = writeSerpCache(keyword, payload);
  return payload;
}

export async function prepareBenchmarkOutline(
  topic,
  contentProfile,
  toneVariant,
  options = {},
) {
  const baseKeyword = keywordFromTopic(topic);
  const searchKeyword = enhanceBenchmarkKeyword(baseKeyword, toneVariant);

  let serpData;
  try {
    serpData = await getSerpData(searchKeyword, {
      maxPages: 1,
      forceRefresh: Boolean(options.forceRefresh),
    });
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      keyword: searchKeyword,
      baseKeyword,
    };
  }

  if (!serpData.items?.length) {
    return {
      ok: false,
      reason: "SERP returned no editorial results after shopping filter",
      keyword: searchKeyword,
      baseKeyword,
      filterStats: serpData.filterStats,
    };
  }

  let outline = synthesizeUniqueOutline({
    sourceHeadings: serpData.sourceHeadings ?? [],
    contentProfile,
    toneVariant,
    topicAngle: topic.angle ?? topic.id,
  });

  let validation = validateOutlineOriginality(outline, serpData.sourceHeadings ?? []);
  if (!validation.ok) {
    outline = synthesizeUniqueOutline({
      sourceHeadings: (serpData.sourceHeadings ?? []).map((s) => ({
        ...s,
        h2: s.h2.map((h, i) => `Section ${i + 1}: ${h.split(" ").slice(-4).join(" ")}`),
      })),
      contentProfile,
      toneVariant,
      topicAngle: topic.angle ?? topic.id,
    });
    validation = validateOutlineOriginality(outline, serpData.sourceHeadings ?? []);
  }

  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reasons.join("; "),
      keyword: searchKeyword,
      baseKeyword,
      validation,
    };
  }

  return {
    ok: true,
    keyword: searchKeyword,
    baseKeyword,
    outline: {
      ...outline,
      keyword: searchKeyword,
      baseKeyword,
      serpSources: serpData.items.slice(0, 10).map((item) => ({
        title: item.title,
        url: item.link,
      })),
      validatedAt: new Date().toISOString(),
      h2Similarity: validation.h2Similarity,
      shingleOverlap: validation.shingleOverlap,
      serpCachePath: serpData.cachePath,
      fromCache: Boolean(serpData.fromCache),
    },
  };
}
