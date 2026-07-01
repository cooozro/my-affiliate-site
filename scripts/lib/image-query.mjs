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
    altScene: { en: "in a small bedroom", ko: "작은 침실" },
    extraSearchQueries: [
      "white HEPA air purifier product isolated",
      "air purifier appliance close up white",
      "room air cleaner device product photo",
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
    altScene: { en: "in an apartment room", ko: "원룸" },
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
    altScene: { en: "on a desk", ko: "책상 위" },
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
    altScene: { en: "on a desk", ko: "책상 위" },
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
    altScene: { en: "with charging case on a desk", ko: "책상 위" },
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
    altScene: { en: "in a humid room", ko: "습한 실내" },
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
    altScene: { en: "charging a smartphone", ko: "책상 위" },
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
    altScene: { en: "on a travel desk", ko: "책상 위" },
  },
  "2026-summer-ac-buying-checklist": {
    imageSearchKeywords: ["portable air conditioner", "window air conditioner"],
    altScene: { en: "in a summer bedroom", ko: "여름 침실" },
    topicCluster: "air-conditioning",
  },
  "2026-summer-bluetooth-speakers-guide": {
    imageSearchKeywords: ["portable bluetooth speaker", "outdoor speaker"],
    altScene: { en: "outdoors in summer", ko: "여름 야외" },
    topicCluster: "audio",
  },
  "2026-budget-monitors-buying-guide": {
    imageSearchKeywords: ["computer monitor", "desk monitor setup"],
    altScene: { en: "on a workspace desk", ko: "책상" },
    topicCluster: "computing",
  },
  welcome: {
    imageSearchKeywords: ["laptop notebook desk research"],
    coverAlt: {
      en: "Laptop and notebook on a desk",
      ko: "책상 위 노트북과 메모",
    },
  },
};

/** Auto-picks that failed vision QA — never reuse. */
export const BLOCKED_ASSET_IDS = new Set([
  "pexels:27176671",
  "pexels:35673090",
  "pixabay:6577523",
  "pixabay:8315886",
  "pixabay:560937",
]);

/**
 * Curated stock IDs tried before open search (each still vision-verified).
 * @type {Record<string, Array<{ provider: 'pexels' | 'pixabay', assetId: number, query?: string }>>}
 */
export const CURATED_SLUG_ASSETS = {
  "2026-air-purifiers-guide": [
    { provider: "pexels", assetId: 3875333, query: "white air purifier product" },
    { provider: "pexels", assetId: 6782062, query: "HEPA air purifier appliance" },
    { provider: "pexels", assetId: 7792874, query: "air purifier room device" },
  ],
  "2026-power-banks-guide": [
    { provider: "pexels", assetId: 4421508, query: "power bank charging phone" },
    { provider: "pexels", assetId: 1630167, query: "portable battery charger USB" },
    { provider: "pexels", assetId: 6078124, query: "portable power bank product" },
  ],
  "2026-budget-power-banks-guide": [
    { provider: "pexels", assetId: 4421508, query: "power bank charging phone" },
    { provider: "pexels", assetId: 6078124, query: "portable power bank product" },
  ],
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

const CLUSTER_ALT_SCENES = {
  "air-quality": { en: "in a small room", ko: "작은 방" },
  "air-conditioning": { en: "in an apartment room", ko: "원룸" },
  audio: { en: "on a desk", ko: "책상 위" },
  smartphones: { en: "on a desk", ko: "책상 위" },
  computing: { en: "on a workspace desk", ko: "책상" },
  power: { en: "charging a phone", ko: "스마트폰 충전" },
  "smart-home": { en: "in a home interior", ko: "실내" },
};

/**
 * Short English subject for alt text (no title, no "cover photo").
 * @param {string[]} productKeywords
 */
export function altSubjectEn(productKeywords) {
  const raw = productKeywords[0]?.trim() || productKeywords.join(" ").trim() || "product";
  const lower = raw.toLowerCase();

  if (lower.includes("air purifier") || lower.includes("hepa")) return "HEPA air purifier";
  if (lower.includes("dehumidifier")) return "home dehumidifier";
  if (lower.includes("portable") && (lower.includes("air") || lower.includes("ac"))) {
    return "portable air conditioner";
  }
  if (lower.includes("window") && lower.includes("air")) return "window air conditioner";
  if (lower.includes("air conditioner") || lower.includes("btu")) return "room air conditioner";
  if (lower.includes("power bank")) return "portable power bank";
  if (lower.includes("earbuds") || lower.includes("earphone")) return "wireless earbuds";
  if (lower.includes("headphone")) return "noise-cancelling headphones";
  if (lower.includes("smartphone") || lower.includes("phone")) return "budget smartphone";
  if (lower.includes("keyboard")) return "mechanical keyboard";
  if (lower.includes("monitor")) return "computer monitor";
  if (lower.includes("bluetooth") && lower.includes("speaker")) {
    return "portable Bluetooth speaker";
  }
  if (lower.includes("speaker")) return "Bluetooth speaker";
  if (lower.includes("webcam")) return "webcam";
  if (lower.includes("tablet")) return "tablet";
  if (lower.includes("fitness") || lower.includes("tracker")) return "fitness tracker";
  if (lower.includes("robot") && lower.includes("vacuum")) return "robot vacuum";
  if (lower.includes("vacuum")) return "cordless vacuum";
  if (lower.includes("fan")) return "electric fan";
  if (lower.includes("humidifier")) return "humidifier";
  if (lower.includes("laptop")) return "laptop";

  return raw.split(/\s+/).slice(0, 4).join(" ");
}

/**
 * @param {string[]} productKeywords
 */
export function altSubjectKo(productKeywords) {
  return mapKeywordToKo(altSubjectEn(productKeywords));
}

function resolveAltScene(ctx) {
  const profile = slugProfile(ctx.slug);
  if (profile?.altScene) return profile.altScene;

  const cluster =
    ctx.topicCluster ?? inferClusterFromKeywords(ctx.productKeywords ?? []);
  return CLUSTER_ALT_SCENES[cluster] ?? null;
}

/**
 * @param {'en' | 'ko'} locale
 * @param {{ slug?: string, title?: string, productKeywords: string[], topicCluster?: string }} ctx
 */
export function buildCoverAlt(locale, ctx) {
  const profile = slugProfile(ctx.slug);
  if (profile?.coverAlt?.[locale]) {
    return profile.coverAlt[locale];
  }

  const scene = resolveAltScene(ctx);
  const keywords = ctx.productKeywords ?? [];

  if (locale === "ko") {
    const subject = altSubjectKo(keywords);
    if (scene?.ko) return `${scene.ko}의 ${subject}`;
    return subject;
  }

  const subject = altSubjectEn(keywords);
  if (scene?.en) return `${subject} ${scene.en}`;
  return subject;
}

/**
 * @param {{ slug?: string, title?: string, productKeywords: string[], topicCluster?: string }} ctx
 */
export function buildCoverAlts(ctx) {
  const topicCluster =
    ctx.topicCluster ??
    (ctx.slug
      ? resolveImageContext(ctx.slug, ctx).topicCluster
      : inferClusterFromKeywords(ctx.productKeywords ?? []));

  const full = { ...ctx, topicCluster };
  return {
    en: buildCoverAlt("en", full),
    ko: buildCoverAlt("ko", full),
  };
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
  if (k.includes("webcam")) return "웹캠";
  if (k.includes("tablet")) return "태블릿";
  if (k.includes("fitness") || k.includes("tracker")) return "피트니스 트래커";
  if (k.includes("robot") && k.includes("vacuum")) return "로봇 청소기";
  if (k.includes("vacuum")) return "무선 청소기";
  if (k.includes("fan")) return "선풍기";
  if (k.includes("humidifier")) return "가습기";
  if (k.includes("laptop")) return "노트북";
  if (k.includes("product research") || k.includes("notebook")) {
    return "노트북과 메모";
  }
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
