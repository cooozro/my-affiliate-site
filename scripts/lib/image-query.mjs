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

/** Season signals from title/slug/tags — drives search queries and scene rejection. */
const SEASON_SIGNALS = {
  summer: {
    tokens: ["summer", "heat", "humid", "hot weather", "폭염", "여름"],
    searchBoost: ["outdoor summer", "sunny", "warm weather", "park workout"],
    sceneReject: [
      "snow",
      "snowy",
      "winter",
      "blizzard",
      "ice",
      "frozen",
      "ski",
      "skiing",
      "cold weather",
      "beanie",
      "coat",
      "frost",
    ],
  },
  winter: {
    tokens: ["winter", "cold", "snow", "holiday", "겨울"],
    searchBoost: ["winter indoor", "cozy home"],
    sceneReject: ["beach", "swimming pool", "summer heat", "tropical"],
  },
  spring: {
    tokens: ["spring", "봄"],
    searchBoost: ["spring outdoor"],
    sceneReject: ["snow", "blizzard", "ski"],
  },
  fall: {
    tokens: ["fall", "autumn", "가을"],
    searchBoost: ["autumn"],
    sceneReject: ["beach summer", "swimming pool"],
  },
};

/** Per-topic defaults — applied when slug has no explicit profile. */
export const TOPIC_IMAGE_PROFILES = {
  "fitness-trackers": {
    imageSearchKeywords: [
      "fitness tracker wrist",
      "smart band outdoor workout",
      "wearable fitness watch",
    ],
    extraSearchQueries: [
      "fitness tracker wrist sunny outdoor",
      "smartwatch running summer park",
      "wearable band workout trail",
    ],
    topicCluster: "wearables",
    altScene: { en: "during an outdoor summer workout", ko: "여름 야외 운동" },
    forbiddenSubjects: ["snow scene", "winter coat", "ski gear"],
    extraNegatives: [
      "snow",
      "snowy",
      "winter",
      "blizzard",
      "ice",
      "ski",
      "skiing",
      "beanie",
      "cold weather",
    ],
  },
  "tablet-budget": {
    imageSearchKeywords: [
      "budget tablet",
      "android tablet reading",
      "tablet desk study",
    ],
    extraSearchQueries: [
      "tablet reading summer travel",
      "budget android tablet product",
      "tablet video streaming couch",
    ],
    topicCluster: "tablets",
    altScene: { en: "on a desk for reading", ko: "책상 위" },
    forbiddenSubjects: ["laptop only", "smartphone only", "keyboard only"],
  },
  "window-ac": {
    imageSearchKeywords: [
      "window air conditioner",
      "wall mounted AC unit",
      "apartment cooling",
    ],
    extraSearchQueries: [
      "window AC unit installed apartment",
      "room air conditioner summer",
    ],
    topicCluster: "air-conditioning",
    altScene: { en: "in a summer bedroom", ko: "여름 침실" },
  },
  "smart-home-cameras": {
    imageSearchKeywords: [
      "home security camera",
      "indoor security camera",
      "smart home camera",
    ],
    extraSearchQueries: [
      "home security camera wall mount",
      "indoor surveillance camera product",
      "smart home security camera white",
    ],
    topicCluster: "smart-home",
    altScene: { en: "in a home interior", ko: "실내" },
    forbiddenSubjects: ["laptop only", "smartphone only", "drone aerial only"],
    extraNegatives: ["wheat", "grain", "food", "tablet only", "laptop only"],
  },
  "cordless-vacuums": {
    imageSearchKeywords: [
      "cordless stick vacuum cleaner",
      "handheld stick vacuum hardwood",
      "upright cordless vacuum product",
    ],
    extraSearchQueries: [
      "stick vacuum cleaner product photo",
      "cordless vacuum hardwood floor",
      "handheld vacuum cleaner home",
    ],
    forbiddenSubjects: [
      "robot vacuum",
      "robotic vacuum",
      "round vacuum",
      "autonomous vacuum",
      "robot cleaner",
      "mop robot",
      "vacuum robot",
    ],
    extraNegatives: [
      "robot",
      "robotic",
      "autonomous",
      "round",
      "dock",
      "docking station",
      "irobot",
      "roborock",
      "roomba",
    ],
    topicCluster: "floor-care",
    altScene: { en: "on a hardwood floor", ko: "마루 바닥" },
  },
  "robot-vacuums": {
    imageSearchKeywords: [
      "robot vacuum smart home",
      "robot vacuum hardwood floor",
      "robotic vacuum cleaner round",
    ],
    extraSearchQueries: [
      "robot vacuum on hardwood",
      "autonomous vacuum cleaner home",
      "round robot vacuum product",
    ],
    forbiddenSubjects: [
      "stick vacuum",
      "cordless stick",
      "handheld vacuum",
      "upright vacuum",
      "canister vacuum",
    ],
    extraNegatives: [
      "stick vacuum",
      "handheld",
      "upright",
      "cordless stick",
      "canister",
    ],
    topicCluster: "floor-care",
    altScene: { en: "on a hardwood floor", ko: "마루 바닥" },
  },
};

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
  "2026-cordless-vacuums-scenario-guide": {
    imageSearchKeywords: [
      "cordless stick vacuum cleaner",
      "handheld stick vacuum hardwood",
      "upright cordless vacuum product",
    ],
    extraSearchQueries: [
      "stick vacuum cleaner product photo",
      "cordless vacuum hardwood floor",
      "handheld vacuum cleaner home",
    ],
    forbiddenSubjects: [
      "robot vacuum",
      "robotic vacuum",
      "round vacuum",
      "autonomous vacuum",
      "robot cleaner",
      "mop robot",
      "vacuum robot",
    ],
    extraNegatives: [
      "robot",
      "robotic",
      "autonomous",
      "round",
      "dock",
      "docking station",
      "irobot",
      "roborock",
      "roomba",
    ],
    topicCluster: "floor-care",
    altScene: { en: "on a hardwood floor", ko: "마루 바닥" },
  },
  "2026-robot-vacuums-scenario-guide": {
    imageSearchKeywords: [
      "robot vacuum smart home",
      "robot vacuum hardwood floor",
      "robotic vacuum cleaner round",
    ],
    extraSearchQueries: [
      "robot vacuum on hardwood",
      "autonomous vacuum cleaner home",
      "round robot vacuum product",
    ],
    forbiddenSubjects: [
      "stick vacuum",
      "cordless stick",
      "handheld vacuum",
      "upright vacuum",
      "canister vacuum",
    ],
    extraNegatives: [
      "stick vacuum",
      "handheld",
      "upright",
      "cordless stick",
      "canister",
    ],
    topicCluster: "floor-care",
    altScene: { en: "on a hardwood floor", ko: "마루 바닥" },
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
  "2026-budget-fitness-trackers-head-to-head": {
    imageSearchKeywords: [
      "fitness tracker wrist outdoor",
      "smart band summer workout",
      "wearable fitness watch",
    ],
    extraSearchQueries: [
      "fitness tracker wrist sunny park",
      "smartwatch running outdoor summer",
      "wearable band workout trail",
    ],
    topicCluster: "wearables",
    altScene: { en: "during an outdoor summer workout", ko: "여름 야외 운동" },
    forbiddenSubjects: ["snow", "winter coat", "ski"],
    extraNegatives: [
      "snow",
      "snowy",
      "winter",
      "blizzard",
      "ice",
      "ski",
      "beanie",
      "cold weather",
    ],
  },
  "2026-summer-budget-tablets-buying-guide": {
    imageSearchKeywords: [
      "budget tablet",
      "android tablet reading",
      "tablet desk study",
    ],
    extraSearchQueries: [
      "tablet reading summer travel",
      "budget android tablet product",
      "tablet video streaming couch",
    ],
    topicCluster: "tablets",
    altScene: { en: "on a desk for reading", ko: "책상 위" },
    forbiddenSubjects: ["laptop only", "smartphone only"],
  },
  "2026-smart-home-cameras-explainer": {
    imageSearchKeywords: [
      "home security camera",
      "indoor security camera",
      "smart home camera",
    ],
    extraSearchQueries: [
      "home security camera wall mount",
      "indoor surveillance camera product",
    ],
    topicCluster: "smart-home",
    altScene: { en: "in a home interior", ko: "실내" },
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
  "pexels:6740742",
  "pexels:6338558",
  "pexels:4348401",
  "pexels:4056535",
  "pexels:4761012",
  "pexels:35147242",
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
  "2026-budget-fitness-trackers-head-to-head": [
    { provider: "pexels", assetId: 6846257, query: "fitness tracker wrist vital signs" },
    { provider: "pexels", assetId: 4379290, query: "fitness smartwatch outdoor exercise" },
    { provider: "pexels", assetId: 4379288, query: "smartwatch fitness data wrist outdoor" },
  ],
  "2026-summer-budget-tablets-buying-guide": [
    { provider: "pexels", assetId: 8533358, query: "tablet on desk minimalist" },
    { provider: "pexels", assetId: 3645274, query: "person using tablet" },
    { provider: "pexels", assetId: 7870426, query: "tablet workspace desk" },
  ],
  "2026-smart-home-cameras-explainer": [
    { provider: "pexels", assetId: 16423102, query: "home security camera indoor" },
    { provider: "pexels", assetId: 24347621, query: "smart home security camera" },
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
  wearables: [
    "earbuds",
    "smartphone",
    "keyboard",
    "airplane",
    "laptop",
    "vacuum",
    "air conditioner",
    "snow",
    "snowy",
    "winter",
    "blizzard",
    "ski",
    "ice",
    "beanie",
  ],
  tablets: [
    "earbuds",
    "smartphone only",
    "keyboard only",
    "airplane",
    "vacuum",
    "air conditioner",
    "snow",
    "winter coat",
    "wheat",
    "grain",
    "sack",
    "harvest",
    "farmer",
    "crop",
    "grocery",
    "market stall",
    "food bag",
  ],
  "floor-care": [
    ...GLOBAL_STOCK_NEGATIVES,
    "air purifier",
    "air conditioner",
  ],
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

function slugProfile(slug, topicId) {
  if (slug && SLUG_IMAGE_PROFILES[slug]) return SLUG_IMAGE_PROFILES[slug];
  if (topicId && TOPIC_IMAGE_PROFILES[topicId]) return TOPIC_IMAGE_PROFILES[topicId];
  if (slug?.includes("fitness-tracker")) return TOPIC_IMAGE_PROFILES["fitness-trackers"];
  if (slug?.includes("tablet")) return TOPIC_IMAGE_PROFILES["tablet-budget"];
  return null;
}

/**
 * Detect editorial season from title, slug, and tags (not stripped stop-words).
 * @param {{ title?: string, slug?: string, tags?: string[] }} input
 * @returns {{ season: string | null, searchBoost: string[], sceneReject: string[] }}
 */
export function extractSeasonContext(input = {}) {
  const blob = [
    input.title ?? "",
    input.slug ?? "",
    ...(input.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  for (const [season, cfg] of Object.entries(SEASON_SIGNALS)) {
    if (cfg.tokens.some((token) => blob.includes(token.toLowerCase()))) {
      return {
        season,
        searchBoost: cfg.searchBoost,
        sceneReject: cfg.sceneReject,
      };
    }
  }

  return { season: null, searchBoost: [], sceneReject: [] };
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
  const topicId = topic.id ?? input.topicId;
  const profile = slugProfile(input.slug, topicId);

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
  const topicId = topic.id ?? input.topicId;
  const profile = slugProfile(input.slug, topicId);
  const season = extractSeasonContext({
    title: input.title,
    slug: input.slug,
    tags: input.tags,
  });
  const primary = productKeywords.slice(0, 2).join(" ");
  const secondary = productKeywords[0] ?? "product";

  const seasonQueries =
    season.season && season.searchBoost.length > 0
      ? season.searchBoost.map((boost) => `${secondary} ${boost}`)
      : [];

  const queries = uniqueStrings([
    ...(profile?.extraSearchQueries ?? []),
    ...seasonQueries,
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

export function forbiddenSubjectsForCluster(topicCluster, slug, topicId) {
  const profile = slugProfile(slug, topicId);
  const mode = vacuumTopicMode(topicId, slug);
  const vacuumForbidden =
    mode === "cordless"
      ? VACUUM_CORDLESS_NEGATIVES
      : mode === "robot"
        ? VACUUM_ROBOT_NEGATIVES
        : [];
  return uniqueStrings([
    ...(profile?.forbiddenSubjects ?? []),
    ...(CLUSTER_FORBIDDEN[topicCluster] ?? []),
    ...vacuumForbidden,
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
  "floor-care": ["airplane", "aircraft"],
};

export function negativeTagsForCluster(topicCluster, slug, seasonContext, topicId) {
  const profile = slugProfile(slug, topicId);
  const mode = vacuumTopicMode(topicId, slug);
  const vacuumNegatives =
    mode === "cordless"
      ? VACUUM_CORDLESS_NEGATIVES
      : mode === "robot"
        ? VACUUM_ROBOT_NEGATIVES
        : [];
  return uniqueStrings([
    ...(CLUSTER_NEGATIVES[topicCluster] ?? []),
    ...(profile?.extraNegatives ?? []),
    ...vacuumNegatives,
    ...(seasonContext?.sceneReject ?? []),
    ...DEFAULT_NEGATIVES,
  ]);
}

/** Product nouns that must appear in provider alt/tags — not inferred from search query. */
const CLUSTER_PRODUCT_ANCHORS = {
  wearables: ["tracker", "smartwatch", "smart band", "fitness band", "wearable", "watch"],
  tablets: ["tablet", "ipad"],
  computing: ["laptop", "monitor", "keyboard", "computer", "desktop"],
  smartphones: ["smartphone", "iphone", "android phone", "mobile phone", "phone"],
  audio: ["headphone", "earbud", "earphone", "speaker"],
  power: ["power bank", "charger", "battery pack"],
  "air-quality": ["air purifier", "purifier", "dehumidifier"],
  "air-conditioning": ["air conditioner", "portable ac", "window ac", "ac unit"],
  "floor-care": ["vacuum", "robot vacuum"],
  "smart-home": ["camera", "security camera", "cctv", "surveillance", "webcam"],
};

const VACUUM_CORDLESS_NEGATIVES = [
  "robot vacuum",
  "robotic vacuum",
  "round vacuum",
  "autonomous vacuum",
  "robot cleaner",
  "mop robot",
  "vacuum robot",
  "irobot",
  "roborock",
  "roomba",
  "docking station",
];

const VACUUM_ROBOT_NEGATIVES = [
  "stick vacuum",
  "cordless stick",
  "handheld vacuum",
  "upright vacuum",
  "canister vacuum",
  "cordless vacuum cleaner stick",
];

/** Provider alt must include one of these for cordless-vacuum topics. */
const CORDLESS_STICK_ALT_MARKERS = [
  "stick vacuum",
  "cordless stick",
  "handheld vacuum",
  "upright cordless",
  "stick cleaner",
];

/** Text-only fetch mode: higher bar when vision API is unavailable (e.g. GHA). */
export const VACUUM_TEXT_MIN_SCORE = 8;
export const DEFAULT_TEXT_MIN_SCORE = 6;

/** @returns {'cordless' | 'robot' | null} */
export function vacuumTopicMode(topicId, slug) {
  if (topicId === "robot-vacuums" || slug?.includes("robot-vacuum")) return "robot";
  if (topicId === "cordless-vacuums" || slug?.includes("cordless-vacuum")) {
    return "cordless";
  }
  return null;
}

export function requiredProductAnchors(productKeywords, topicCluster, topicId, slug) {
  const mode = vacuumTopicMode(topicId, slug);
  if (mode === "cordless") {
    return [...CORDLESS_STICK_ALT_MARKERS];
  }
  if (mode === "robot") {
    return ["robot vacuum", "robotic", "robot"];
  }

  const blob = productKeywords.join(" ").toLowerCase();
  const anchors = new Set();

  for (const anchor of CLUSTER_PRODUCT_ANCHORS[topicCluster] ?? []) {
    const head = anchor.split(/\s+/)[0];
    if (blob.includes(anchor) || blob.includes(head)) anchors.add(anchor);
  }

  for (const kw of productKeywords) {
    const lower = kw.toLowerCase();
    if (lower.includes("tablet")) anchors.add("tablet");
    if (lower.includes("ipad")) anchors.add("ipad");
    if (lower.includes("laptop")) anchors.add("laptop");
    if (lower.includes("monitor")) anchors.add("monitor");
    if (lower.includes("keyboard")) anchors.add("keyboard");
    if (lower.includes("smartphone") || lower.includes("phone")) anchors.add("phone");
    if (lower.includes("earbuds") || lower.includes("earphone")) anchors.add("earbud");
    if (lower.includes("headphone")) anchors.add("headphone");
    if (lower.includes("speaker")) anchors.add("speaker");
    if (lower.includes("tracker") || lower.includes("smartwatch")) anchors.add("tracker");
    if (lower.includes("purifier")) anchors.add("purifier");
    if (lower.includes("dehumidifier")) anchors.add("dehumidifier");
    if (lower.includes("air conditioner") || /\bac\b/.test(lower)) anchors.add("air conditioner");
    if (lower.includes("vacuum") && mode == null) anchors.add("vacuum");
    if (lower.includes("power bank")) anchors.add("power bank");
    if (lower.includes("camera")) anchors.add("camera");
  }

  return [...anchors];
}

/** Known robot-vacuum stock IDs — never use on cordless-vacuum posts. */
export const ROBOT_VACUUM_ASSET_IDS = new Set([
  "pexels:35147242",
  "pexels:8566421",
  "pexels:8566426",
]);

/**
 * Hard gate: provider alt/tags must mention the product — search query is NOT counted.
 * @param {string} providerAlt
 * @param {string[]} anchors
 */
export function passesProductAltGate(providerAlt, anchors) {
  if (!anchors?.length) return true;
  const alt = String(providerAlt ?? "").toLowerCase().trim();
  if (!alt) return false;
  return anchors.some((anchor) => alt.includes(anchor.toLowerCase()));
}

/**
 * Reject stock metadata that mismatches cordless stick vs robot vacuum topics.
 * @param {string} providerAlt
 * @param {string} [topicId]
 * @param {string} [slug]
 */
export function passesVacuumTypeAltGate(providerAlt, topicId, slug) {
  const mode = vacuumTopicMode(topicId, slug);
  if (!mode) return true;

  const alt = String(providerAlt ?? "").toLowerCase().trim();
  if (!alt) return mode !== "cordless";

  if (mode === "cordless") {
    if (/\b(robot|robotic|autonomous|roomba|roborock|irobot)\b/.test(alt)) {
      return false;
    }
    if (/\bround\b/.test(alt) && /\bvacuum\b/.test(alt)) return false;
    return passesProductAltGate(alt, CORDLESS_STICK_ALT_MARKERS);
  }

  if (mode === "robot") {
    if (/\b(stick vacuum|handheld vacuum|cordless stick|upright vacuum|canister vacuum)\b/.test(alt)) {
      return false;
    }
    return (
      /\b(robot vacuum|robotic vacuum|autonomous vacuum|roomba)\b/.test(alt) ||
      (/\brobot\b/.test(alt) && /\bvacuum\b/.test(alt))
    );
  }

  return true;
}

export function isRobotVacuumAsset(provider, assetId) {
  return ROBOT_VACUUM_ASSET_IDS.has(`${provider}:${assetId}`);
}

/**
 * @param {string} text — provider alt/tags only (never append search query)
 * @param {string} [topicId]
 * @param {string} [slug]
 */
export function scoreImageRelevance(text, productKeywords, negatives, seasonContext, topicId, slug) {
  const blob = String(text ?? "").toLowerCase();
  if (!blob) return 0;

  let score = 0;

  for (const negative of negatives) {
    const n = negative.toLowerCase();
    if (n.length >= 3 && blob.includes(n)) return -100;
  }

  const mode = vacuumTopicMode(topicId, slug);
  if (mode === "cordless") {
    if (/\b(robot|robotic|autonomous|roomba|roborock|irobot)\b/.test(blob)) return -100;
    if (passesProductAltGate(blob, CORDLESS_STICK_ALT_MARKERS)) score += 4;
  } else if (mode === "robot") {
    if (/\b(stick vacuum|handheld vacuum|cordless stick|upright vacuum)\b/.test(blob)) {
      return -100;
    }
    if (/\b(robot vacuum|robotic vacuum|autonomous vacuum)\b/.test(blob)) score += 4;
  }

  if (seasonContext?.sceneReject) {
    for (const term of seasonContext.sceneReject) {
      if (blob.includes(term.toLowerCase())) return -100;
    }
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

  if (seasonContext?.searchBoost) {
    for (const boost of seasonContext.searchBoost) {
      const tokens = boost.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
      const hits = tokens.filter((t) => blob.includes(t)).length;
      if (hits >= 2) score += 3;
      else if (hits === 1) score += 1;
    }
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
  wearables: { en: "during an outdoor workout", ko: "야외 운동" },
  tablets: { en: "on a desk for reading", ko: "책상 위" },
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
  const profile = slugProfile(ctx.slug, ctx.topicId);
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
  const topicId = topic.id ?? meta.topicId;
  const profile = slugProfile(slug, topicId);
  const seasonContext = extractSeasonContext({
    title: meta.title,
    slug,
    tags: meta.tags,
  });

  const productKeywords = deriveProductKeywords({
    slug,
    title: meta.title,
    tags: meta.tags,
    imageSearchKeywords: meta.imageSearchKeywords,
    imageQuery: meta.imageQuery,
    topic,
    topicId,
  });

  const topicCluster =
    meta.topicCluster ??
    profile?.topicCluster ??
    topic.topicCluster ??
    inferClusterFromKeywords(productKeywords);

  return {
    slug,
    title: meta.title,
    topicId,
    tags: meta.tags ?? [],
    productKeywords,
    primaryKeyword: primaryImageKeyword(productKeywords),
    searchQueries: buildSearchQueries(productKeywords, { ...meta, slug, topicId }),
    negativeTags: negativeTagsForCluster(topicCluster, slug, seasonContext, topicId),
    forbiddenSubjects: forbiddenSubjectsForCluster(topicCluster, slug, topicId),
    topicCluster,
    seasonContext,
    requiredAnchors: requiredProductAnchors(productKeywords, topicCluster, topicId, slug),
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
  if (blob.includes("fitness") || blob.includes("tracker") || blob.includes("smartwatch") || blob.includes("wearable")) {
    return "wearables";
  }
  if (blob.includes("tablet")) return "tablets";
  return "smart-home";
}
