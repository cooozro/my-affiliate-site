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

/** Per-slug tuned keywords — avoids ambiguous stock search (e.g. air → airplane). */
export const SLUG_IMAGE_PROFILES = {
  "2026-air-purifiers-guide": {
    imageSearchKeywords: [
      "HEPA air purifier",
      "room air cleaner device",
      "indoor air purifier",
    ],
    extraSearchQueries: [
      "HEPA air purifier bedroom",
      "white air purifier appliance table",
      "indoor air purifier device close up",
    ],
    forbiddenSubjects: [
      "vacuum cleaner",
      "robot vacuum",
      "cordless vacuum",
      "airplane",
      "aircraft",
    ],
    topicCluster: "air-quality",
  },
  "2026-portable-vs-window-ac-head-to-head": {
    imageSearchKeywords: [
      "portable air conditioner",
      "window air conditioner unit",
    ],
    extraSearchQueries: [
      "portable AC unit hose window",
      "window mounted air conditioner",
      "room air conditioner appliance",
    ],
    topicCluster: "air-conditioning",
  },
  "2026-budget-mechanical-keyboards-guide": {
    imageSearchKeywords: [
      "mechanical keyboard",
      "hot swap keyboard",
      "gaming keyboard desk",
    ],
    extraSearchQueries: [
      "mechanical keyboard RGB desk",
      "tenkeyless mechanical keyboard",
    ],
    topicCluster: "computing",
  },
  "2026-budget-smartphones-under-300": {
    imageSearchKeywords: [
      "budget smartphone",
      "android phone handset",
    ],
    extraSearchQueries: [
      "smartphone on desk product",
      "mobile phone budget device",
    ],
    topicCluster: "smartphones",
  },
  "2026-budget-wireless-earbuds-top5": {
    imageSearchKeywords: [
      "wireless earbuds",
      "true wireless earphones",
      "TWS earbuds case",
    ],
    extraSearchQueries: [
      "wireless earbuds charging case",
      "bluetooth earbuds product photo",
    ],
    topicCluster: "audio",
  },
  "2026-dehumidifiers-guide": {
    imageSearchKeywords: [
      "home dehumidifier",
      "room dehumidifier appliance",
    ],
    extraSearchQueries: [
      "dehumidifier bedroom appliance",
      "portable dehumidifier unit",
    ],
    forbiddenSubjects: ["air purifier", "vacuum cleaner", "clock", "watch"],
    topicCluster: "air-quality",
  },
  "2026-power-banks-guide": {
    imageSearchKeywords: [
      "portable power bank",
      "USB-C power bank charger",
      "battery pack phone charging",
    ],
    extraSearchQueries: [
      "portable charger power bank desk",
      "USB C PD power bank",
      "mobile battery pack charging phone",
    ],
    forbiddenSubjects: [
      "clock",
      "wristwatch",
      "watch",
      "wall clock",
      "alarm clock",
    ],
    topicCluster: "power",
  },
  "2026-budget-power-banks-guide": {
    imageSearchKeywords: [
      "portable power bank",
      "USB-C power bank",
      "phone charging battery pack",
    ],
    extraSearchQueries: [
      "power bank charging smartphone",
      "portable battery charger travel",
    ],
    forbiddenSubjects: ["clock", "wristwatch", "watch", "wall clock"],
    topicCluster: "power",
  },
};

const SLUG_TOKEN_MAP = {
  ac: "air conditioner",
  purifiers: "HEPA air purifier",
  purifier: "HEPA air purifier",
  dehumidifiers: "home dehumidifier",
  dehumidifier: "home dehumidifier",
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

/** Reject common wrong-subject stock photo tags. */
const GLOBAL_STOCK_NEGATIVES = [
  "airplane",
  "aircraft",
  "aviation",
  "airport",
  "jet",
  "cockpit",
  "pilot",
  "flight",
  "airline",
  "helicopter",
  "drone aerial only",
];

const CLUSTER_NEGATIVES = {
  "air-quality": [
    ...GLOBAL_STOCK_NEGATIVES,
    "vacuum",
    "vacuum cleaner",
    "robot vacuum",
    "cordless vacuum",
    "stick vacuum",
    "cleaner",
    "air conditioner",
    "portable ac",
    "window ac",
    "earbuds",
    "smartphone",
    "keyboard",
    "clock",
    "watch",
    "wristwatch",
    "swimming pool",
  ],
  "air-conditioning": [
    ...GLOBAL_STOCK_NEGATIVES,
    "air purifier",
    "hepa filter only",
    "earbuds",
    "headphone",
    "smartphone",
    "keyboard",
    "cat",
    "pool",
    "sunglasses",
    "power bank",
    "laptop",
  ],
  audio: [
    "air conditioner",
    "air purifier",
    "keyboard",
    "monitor",
    "cat",
    "dog",
    "airplane",
    "aircraft",
  ],
  smartphones: ["earbuds", "keyboard", "air conditioner", "air purifier", "cat", "airplane"],
  computing: ["earbuds", "smartphone", "air conditioner", "air purifier", "cat", "airplane"],
  power: [
    "earbuds",
    "smartphone",
    "keyboard",
    "air conditioner",
    "airplane",
    "clock",
    "watch",
    "wristwatch",
    "wall clock",
    "alarm clock",
    "timepiece",
  ],
  "smart-home": ["earbuds", "smartphone", "keyboard", "airplane", "aircraft"],
};

const DEFAULT_NEGATIVES = [
  "cat",
  "cats",
  "kitten",
  "kittens",
  "dog",
  "puppy",
  "pet",
  "pets",
  ...GLOBAL_STOCK_NEGATIVES,
];

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

function slugProfile(slug) {
  return slug ? SLUG_IMAGE_PROFILES[slug] ?? null : null;
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
  const profile = slugProfile(input.slug);

  const explicit = uniqueStrings([
    ...(profile?.imageSearchKeywords ?? []),
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
 * @param {{ slug?: string, imageQuery?: string, topic?: { imageQuery?: string } }} [input]
 */
export function buildSearchQueries(productKeywords, input = {}) {
  const topic = input.topic ?? {};
  const profile = slugProfile(input.slug);
  const primary = productKeywords.slice(0, 2).join(" ");
  const secondary = productKeywords[0] ?? "product";

  const queries = uniqueStrings([
    ...(profile?.extraSearchQueries ?? []),
    primary,
    `${secondary} product photo`,
    `${secondary} appliance`,
    input.imageQuery,
    topic.imageQuery,
    profile?.extraSearchQueries?.[0],
  ]);

  return queries.filter((q) => {
    const lower = q.toLowerCase();
    if (lower === "air" || lower === "air product photo") return false;
    return true;
  });
}

export function forbiddenSubjectsForCluster(topicCluster, slug) {
  const profile = slugProfile(slug);
  return uniqueStrings([
    ...(profile?.forbiddenSubjects ?? []),
    ...(CLUSTER_FORBIDDEN[topicCluster] ?? []),
  ]);
}

const CLUSTER_FORBIDDEN = {
  "air-quality": [
    "vacuum cleaner",
    "robot vacuum",
    "cordless vacuum",
    "airplane",
    "aircraft",
    "clock",
    "watch",
  ],
  power: ["clock", "wristwatch", "wall clock", "alarm clock", "watch"],
  audio: ["clock", "watch", "air conditioner"],
  smartphones: ["clock", "watch", "earbuds only"],
};

export function negativeTagsForCluster(topicCluster, slug) {
  const profile = slugProfile(slug);
  return uniqueStrings([
    ...(CLUSTER_NEGATIVES[topicCluster] ?? []),
    ...(profile?.extraNegatives ?? []),
    ...DEFAULT_NEGATIVES,
  ]);
}

/**
 * @param {string} text
 * @param {string[]} productKeywords
 * @param {string[]} negatives
 */
export function scoreImageRelevance(text, productKeywords, negatives) {
  const blob = String(text ?? "").toLowerCase();
  if (!blob) return 0;

  let score = 0;

  for (const negative of negatives) {
    const n = negative.toLowerCase();
    if (n.length >= 3 && blob.includes(n)) return -100;
  }

  for (const keyword of productKeywords) {
    const k = keyword.toLowerCase();
    if (blob.includes(k)) {
      score += 6;
      continue;
    }
    const tokens = k.split(/\s+/).filter((t) => t.length > 3);
    let tokenHits = 0;
    for (const token of tokens) {
      if (blob.includes(token)) tokenHits += 1;
    }
    if (tokenHits >= 2) score += 4;
    else if (tokenHits === 1) score += 1;
  }

  if (blob.includes("air ") && !blob.includes("purifier") && !blob.includes("conditioner")) {
    const needsPurifier = productKeywords.some((k) => k.toLowerCase().includes("purifier"));
    if (needsPurifier) score -= 8;
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
 * Primary SEO keyword for filename / alt (first 2 product keywords condensed).
 */
export function primaryImageKeyword(productKeywords) {
  const primary = productKeywords.slice(0, 2).join(" ");
  return primary || "product";
}

/**
 * @param {string[]} productKeywords
 * @param {string} slug
 */
export function buildCoverFilename(productKeywords, slug) {
  const slugified = primaryImageKeyword(productKeywords)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

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
  const focus = primaryImageKeyword(ctx.productKeywords);
  const title = ctx.title?.trim();

  if (locale === "ko") {
    const koFocus = mapKeywordToKo(focus);
    if (title) return `${koFocus} — ${title} 커버 이미지`;
    return `${koFocus} 제품 사진`;
  }

  if (title) return `${focus} — ${title} cover photo`;
  return `${focus} product photo`;
}

function mapKeywordToKo(keyword) {
  const k = keyword.toLowerCase();
  if (k.includes("air purifier") || k.includes("hepa")) return "HEPA 공기청정기";
  if (k.includes("dehumidifier")) return "제습기";
  if (k.includes("portable") && k.includes("air")) return "이동식 에어컨";
  if (k.includes("window") && k.includes("air")) return "창문형 에어컨";
  if (k.includes("air conditioner")) return "에어컨";
  if (k.includes("earbuds") || k.includes("earphone")) return "무선 이어폰";
  if (k.includes("smartphone") || k.includes("phone")) return "스마트폰";
  if (k.includes("keyboard")) return "기계식 키보드";
  if (k.includes("monitor")) return "모니터";
  if (k.includes("power bank")) return "보조배터리";
  if (k.includes("bluetooth speaker")) return "블루투스 스피커";
  return keyword;
}

/**
 * @param {string} slug
 * @param {string | Record<string, unknown>} input
 */
export function resolveImageContext(slug, input = {}) {
  const meta = typeof input === "string" ? { imageQuery: input } : input;
  const topic = meta.topic ?? {};
  const profile = slugProfile(slug);

  const productKeywords = deriveProductKeywords({
    slug,
    title: meta.title,
    tags: meta.tags,
    imageSearchKeywords: meta.imageSearchKeywords,
    imageQuery: meta.imageQuery,
    topic,
  });

  const topicCluster =
    meta.topicCluster ??
    profile?.topicCluster ??
    topic.topicCluster ??
    inferClusterFromKeywords(productKeywords);

  return {
    slug,
    title: meta.title,
    tags: meta.tags ?? [],
    productKeywords,
    primaryKeyword: primaryImageKeyword(productKeywords),
    searchQueries: buildSearchQueries(productKeywords, { ...meta, slug }),
    negativeTags: negativeTagsForCluster(topicCluster, slug),
    forbiddenSubjects: forbiddenSubjectsForCluster(topicCluster, slug),
    topicCluster,
    imageSearchKeywords: productKeywords,
  };
}

function inferClusterFromKeywords(keywords) {
  const blob = keywords.join(" ").toLowerCase();
  if (blob.includes("air purifier") || blob.includes("hepa") || blob.includes("dehumidifier")) {
    return "air-quality";
  }
  if (blob.includes("air conditioner") || /\bportable ac\b/.test(blob) || /\bwindow ac\b/.test(blob)) {
    return "air-conditioning";
  }
  if (blob.includes("earbuds") || blob.includes("earphone") || blob.includes("headphone")) {
    return "audio";
  }
  if (blob.includes("smartphone") || blob.includes("phone")) return "smartphones";
  if (blob.includes("keyboard") || blob.includes("monitor")) return "computing";
  if (blob.includes("power bank")) return "power";
  return "smart-home";
}
