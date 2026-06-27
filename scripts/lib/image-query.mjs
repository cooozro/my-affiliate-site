import crypto from "crypto";

/**
 * Derive stock-photo search queries and SEO alt text from post / topic metadata.
 */

const SLUG_STOP_WORDS = new Set([
  "2024",
  "2025",
  "2026",
  "2027",
  "budget",
  "buying",
  "guide",
  "top5",
  "under",
  "summer",
  "winter",
  "spring",
  "fall",
  "head",
  "to",
  "vs",
  "the",
  "and",
  "for",
  "with",
  "best",
  "top",
  "new",
  "checklist",
  "explainer",
  "scenario",
]);

const GENERIC_TAGS = new Set([
  "summer",
  "winter",
  "spring",
  "fall",
  "guide",
  "review",
  "buying",
  "home",
  "appliances",
  "technology",
  "tech",
  "2026",
  "budget",
  "checklist",
]);

const SLUG_TOKEN_MAP = {
  ac: "air conditioner",
  earbuds: "wireless earbuds",
  smartphone: "smartphone",
  smartphones: "smartphone",
  keyboard: "mechanical keyboard",
  keyboards: "mechanical keyboard",
  monitor: "computer monitor",
  monitors: "computer monitor",
  speaker: "bluetooth speaker",
  speakers: "bluetooth speaker",
  btu: "air conditioner BTU",
  portable: "portable",
  window: "window",
};

const CLUSTER_NEGATIVES = {
  "air-conditioning": [
    "earbuds",
    "earbud",
    "headphone",
    "headphones",
    "smartphone",
    "keyboard",
    "monitor",
    "speaker",
    "cat",
    "dog",
    "pool",
    "sunglasses",
    "power bank",
    "laptop",
  ],
  audio: ["air conditioner", "keyboard", "monitor", "cat", "dog"],
  smartphones: ["earbuds", "keyboard", "air conditioner", "cat"],
  computing: ["earbuds", "smartphone", "air conditioner", "cat"],
  power: ["earbuds", "smartphone", "keyboard", "air conditioner"],
  "smart-home": ["earbuds", "smartphone", "keyboard"],
};

const DEFAULT_NEGATIVES = ["cat", "dog", "kitten", "puppy"];

function slugTokens(slug) {
  return slug
    .toLowerCase()
    .split(/[-_]+/)
    .filter((t) => t.length > 1 && !SLUG_STOP_WORDS.has(t));
}

function tokensToProductPhrase(tokens) {
  const parts = [];
  for (const token of tokens) {
    if (SLUG_TOKEN_MAP[token]) {
      parts.push(SLUG_TOKEN_MAP[token]);
    } else if (!SLUG_STOP_WORDS.has(token)) {
      parts.push(token);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const value = String(item ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * @param {{
 *   slug?: string,
 *   title?: string,
 *   tags?: string[],
 *   imageSearchKeywords?: string[],
 *   imageQuery?: string,
 *   topicCluster?: string,
 *   topic?: { imageSearchKeywords?: string[], imageQuery?: string, topicCluster?: string },
 * }} input
 */
export function deriveProductKeywords(input = {}) {
  const topic = input.topic ?? {};
  const explicit = uniqueStrings([
    ...(input.imageSearchKeywords ?? []),
    ...(topic.imageSearchKeywords ?? []),
  ]);
  if (explicit.length > 0) return explicit;

  const tagKeywords = uniqueStrings(input.tags ?? []).filter(
    (tag) => !GENERIC_TAGS.has(tag.toLowerCase()),
  );
  if (tagKeywords.length > 0) return tagKeywords;

  if (input.slug) {
    const fromSlug = tokensToProductPhrase(slugTokens(input.slug));
    if (fromSlug) return [fromSlug];
  }

  if (input.imageQuery?.trim()) return [input.imageQuery.trim()];
  if (topic.imageQuery?.trim()) return [topic.imageQuery.trim()];

  return ["technology product"];
}

/**
 * @param {string[]} productKeywords
 * @param {{ imageQuery?: string, topic?: { imageQuery?: string } }} [input]
 */
export function buildSearchQueries(productKeywords, input = {}) {
  const topic = input.topic ?? {};
  const primary = productKeywords.slice(0, 3).join(" ");
  const secondary = productKeywords.slice(0, 2).join(" ");
  const tertiary = productKeywords[0] ?? "product";

  return uniqueStrings([
    primary,
    secondary,
    input.imageQuery,
    topic.imageQuery,
    `${tertiary} product photo`,
    tertiary,
  ]);
}

export function negativeTagsForCluster(topicCluster) {
  return uniqueStrings([
    ...(CLUSTER_NEGATIVES[topicCluster] ?? []),
    ...DEFAULT_NEGATIVES,
  ]);
}

/**
 * Score how well provider metadata matches the article product keywords.
 * @param {string} text - tags / alt / description blob
 * @param {string[]} productKeywords
 * @param {string[]} negatives
 */
export function scoreImageRelevance(text, productKeywords, negatives) {
  const blob = String(text ?? "").toLowerCase();
  if (!blob) return 0;

  let score = 0;

  for (const keyword of productKeywords) {
    const k = keyword.toLowerCase();
    if (blob.includes(k)) {
      score += 4;
      continue;
    }
    for (const token of k.split(/\s+/)) {
      if (token.length > 3 && blob.includes(token)) score += 1;
    }
  }

  for (const negative of negatives) {
    if (blob.includes(negative.toLowerCase())) score -= 25;
  }

  return score;
}

export function pickRankedCandidate(candidates, slug, minScore = 2) {
  const viable = candidates
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (viable.length === 0) return null;

  const top = viable.slice(0, Math.min(5, viable.length));
  const idx =
    parseInt(
      crypto.createHash("sha256").update(`${slug}:rank`).digest("hex").slice(0, 8),
      16,
    ) % top.length;

  return top[idx];
}

/**
 * SEO-friendly filename inside the post image folder.
 * @param {string[]} productKeywords
 * @param {string} slug
 */
export function buildCoverFilename(productKeywords, slug) {
  const slugified = productKeywords
    .slice(0, 3)
    .map((kw) =>
      kw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-")
    .slice(0, 55);

  if (slugified) return `${slugified}-cover.jpg`;

  const fallback = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-50);

  return `${fallback || "cover"}-cover.jpg`;
}

/**
 * @param {'en' | 'ko'} locale
 * @param {{ title?: string, productKeywords: string[] }} ctx
 */
export function buildCoverAlt(locale, ctx) {
  const keywords = ctx.productKeywords.slice(0, 3);
  const title = ctx.title?.trim();

  if (locale === "ko") {
    const koProducts = keywords
      .map((kw) => {
        const k = kw.toLowerCase();
        if (k.includes("portable") && k.includes("air")) return "이동식 에어컨";
        if (k.includes("window") && k.includes("air")) return "창문형 에어컨";
        if (k.includes("air conditioner") || k === "portable ac" || k === "window ac") {
          return "에어컨";
        }
        if (k.includes("earbuds")) return "무선 이어폰";
        if (k.includes("smartphone")) return "스마트폰";
        if (k.includes("keyboard")) return "기계식 키보드";
        if (k.includes("monitor")) return "모니터";
        if (k.includes("power bank")) return "보조배터리";
        if (k.includes("bluetooth speaker")) return "블루투스 스피커";
        return kw;
      })
      .filter(Boolean);

    const productPhrase = [...new Set(koProducts)].join("·");
    if (title) return `${title} — ${productPhrase} 커버 이미지`;
    return `${productPhrase} 제품 사진`;
  }

  const productPhrase = keywords.join(", ");
  if (title) return `${title} — ${productPhrase} cover photo`;
  return `${productPhrase} product photo`;
}

/**
 * Normalize caller input (string query or metadata object).
 * @param {string} slug
 * @param {string | Record<string, unknown>} input
 */
export function resolveImageContext(slug, input = {}) {
  const meta = typeof input === "string" ? { imageQuery: input } : input;
  const topic = meta.topic ?? {};

  const productKeywords = deriveProductKeywords({
    slug,
    title: meta.title,
    tags: meta.tags,
    imageSearchKeywords: meta.imageSearchKeywords,
    imageQuery: meta.imageQuery,
    topic,
  });

  const topicCluster =
    meta.topicCluster ?? topic.topicCluster ?? inferClusterFromKeywords(productKeywords);

  return {
    slug,
    title: meta.title,
    tags: meta.tags ?? [],
    productKeywords,
    searchQueries: buildSearchQueries(productKeywords, meta),
    negativeTags: negativeTagsForCluster(topicCluster),
    topicCluster,
  };
}

function inferClusterFromKeywords(keywords) {
  const blob = keywords.join(" ").toLowerCase();
  if (blob.includes("air conditioner") || blob.includes(" ac")) return "air-conditioning";
  if (blob.includes("earbuds") || blob.includes("headphone")) return "audio";
  if (blob.includes("smartphone") || blob.includes("phone")) return "smartphones";
  if (blob.includes("keyboard") || blob.includes("monitor")) return "computing";
  if (blob.includes("power bank")) return "power";
  return "smart-home";
}
