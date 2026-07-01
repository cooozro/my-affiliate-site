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

  return score;
}

/**
 * @param {object[]} topics
 * @param {Set<string>} usedIds
 * @param {Date} [date]
 */
export function pickSeasonalTopic(topics, usedIds, date = new Date(), options = {}) {
  const { lightSeason = false } = options;
  const available = topics.filter((t) => !usedIds.has(t.id));
  const pool = available.length > 0 ? available : topics;

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
