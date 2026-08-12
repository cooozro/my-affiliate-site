/**
 * Season-first topic scoring for AI Pick & Report.
 * KST month drives priority: spring/summer/fall/winter + school/vacation events.
 */

/** @typedef {'spring' | 'summer' | 'fall' | 'winter'} SeasonId */

export const SEASON_MONTHS = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
  winter: [12, 1, 2],
};

/** Calendar events that boost specific topic ids (KST months, 1–12). */
export const SEASONAL_EVENTS = [
  {
    id: "back-to-school",
    months: [2, 3, 8, 9],
    label: "개학·신학기",
    topicBoost: [
      "tablet-budget",
      "budget-monitors",
      "usb-c-hubs",
      "webcams",
      "mechanical-keyboards",
    ],
    score: 8,
  },
  {
    id: "summer-vacation",
    months: [6, 7, 8],
    label: "여름·방학",
    topicBoost: [
      "portable-ac",
      "window-ac",
      "air-purifiers",
      "bluetooth-speakers",
      "power-banks",
      "robot-vacuums",
    ],
    score: 10,
  },
  {
    id: "summer-heat",
    months: [5, 6, 7, 8, 9],
    label: "폭염·냉방",
    topicBoost: ["portable-ac", "window-ac", "air-purifiers", "dehumidifiers"],
    score: 12,
  },
  {
    id: "spring-allergy",
    months: [3, 4, 5],
    label: "봄·미세먼지",
    topicBoost: ["air-purifiers", "robot-vacuums"],
    score: 9,
  },
  {
    id: "winter-dry",
    months: [11, 12, 1, 2],
    label: "겨울·건조·난방",
    topicBoost: ["air-purifiers", "fitness-trackers"],
    score: 8,
  },
  {
    id: "holiday-travel",
    months: [12, 1],
    label: "연말·겨울 여행",
    topicBoost: ["power-banks", "wireless-earbuds", "bluetooth-speakers"],
    score: 7,
  },
];

/**
 * @param {Date} [date]
 * @returns {SeasonId}
 */
export function getCurrentSeason(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;

  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(month)) return /** @type {SeasonId} */ (season);
  }
  return "summer";
}

/**
 * @param {Date} [date]
 * @returns {number}
 */
export function getKstMonth(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
}

/**
 * Score a topic for the current calendar context (higher = more urgent).
 * @param {object} topic
 * @param {Date} [date]
 */
export function scoreTopicForSeason(topic, date = new Date()) {
  let score = 0;
  const month = getKstMonth(date);
  const season = getCurrentSeason(date);

  if (topic.seasons?.includes(season)) {
    score += topic.seasonBoost?.[season] ?? 6;
  }

  if (topic.peakMonths?.includes(month)) {
    score += topic.peakMonthBonus ?? 8;
  }

  for (const event of SEASONAL_EVENTS) {
    if (!event.months.includes(month)) continue;
    if (event.topicBoost.includes(topic.id)) {
      score += event.score;
    }
  }

  if (topic.category === "home-appliances" && season === "summer") {
    score += 3;
  }

  if (topic.evergreen === true) {
    score += 5;
  } else if (!isTopicPeakForSeason(topic, date)) {
    score -= 4;
  }

  return score;
}

/**
 * @param {object[]} topics
 * @param {Set<string>} usedIds
 * @param {Date} [date]
 */
export function pickSeasonalTopic(topics, usedIds, date = new Date(), options = {}) {
  const { lightSeason = false, evergreenBlend = 0.38 } = options;
  const available = topics.filter((t) => !usedIds.has(t.id));
  const pool = available.length > 0 ? available : topics;

  const evergreen = pool.filter((t) => t.evergreen === true);
  if (evergreen.length > 0 && Math.random() < evergreenBlend) {
    const rankedEg = evergreen
      .map((topic) => ({
        topic,
        score: scoreTopicForSeason(topic, date),
      }))
      .sort((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id));
    const tier = rankedEg.filter(
      (r) => r.score >= (rankedEg[0]?.score ?? 0) - 2,
    );
    const pick =
      tier[Math.floor(Math.random() * tier.length)]?.topic ?? evergreen[0];
    if (pick) return pick;
  }

  const ranked = pool
    .map((topic) => ({
      topic,
      score: lightSeason
        ? Math.min(scoreTopicForSeason(topic, date), 6)
        : scoreTopicForSeason(topic, date),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.topic.id.localeCompare(b.topic.id);
    });

  const topScore = ranked[0]?.score ?? 0;
  const tier =
    topScore > 0
      ? ranked.filter((r) => r.score >= topScore - (lightSeason ? 4 : 2))
      : ranked;

  const pick = tier[Math.floor(Math.random() * tier.length)]?.topic ?? pool[0];
  return pick;
}

export function getActiveSeasonalEvents(date = new Date()) {
  const month = getKstMonth(date);
  return SEASONAL_EVENTS.filter((e) => e.months.includes(month));
}

const ALL_SEASONS = ["spring", "summer", "fall", "winter"];

/** Hard off-season block only for these (e.g. heaters in August). */
export const SEASONAL_ONLY_TOPIC_IDS = new Set([
  "portable-ac",
  "window-ac",
  "electric-fans",
  "dehumidifiers",
  "humidifiers",
  "space-heaters",
  "electric-blankets",
  "evaporative-coolers",
]);

/**
 * True when topic is appropriate for the current KST season/month.
 * `evergreen` topics (IT/mobile/PC) stay eligible year-round.
 * `SEASONAL_ONLY_TOPIC_IDS` are blocked outside their `seasons` / `peakMonths`.
 */
export function isTopicInSeason(topic, date = new Date()) {
  if (topic?.evergreen === true) return true;

  const seasons = topic?.seasons;
  if (!Array.isArray(seasons) || seasons.length === 0) return true;

  const season = getCurrentSeason(date);
  const month = getKstMonth(date);
  const inWindow =
    seasons.includes(season) ||
    (Array.isArray(topic.peakMonths) && topic.peakMonths.includes(month));

  if (inWindow) return true;

  // Off-season: only hard-block clearly seasonal appliances.
  if (SEASONAL_ONLY_TOPIC_IDS.has(topic.id)) return false;

  // Other topics (phones, laptops, TV…): allow with lower priority — not hard-blocked.
  return true;
}

/** Prefer in-season; for soft off-season topics use score only (see pickSeasonalTopic). */
export function filterTopicsInSeason(topics, date = new Date()) {
  return topics.filter((t) => {
    if (t.evergreen === true) return true;
    if (SEASONAL_ONLY_TOPIC_IDS.has(t.id)) return isTopicInSeason(t, date);
    return true;
  });
}

/** Strong in-season match for scoring (excludes soft off-season). */
export function isTopicPeakForSeason(topic, date = new Date()) {
  if (topic?.evergreen === true) return false;
  const season = getCurrentSeason(date);
  const month = getKstMonth(date);
  if (topic?.seasons?.includes(season)) return true;
  if (Array.isArray(topic.peakMonths) && topic.peakMonths.includes(month)) {
    return true;
  }
  return false;
}
