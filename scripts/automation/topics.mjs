/**
 * IT review topics for AI Pick & Report.
 * Season metadata drives pickTopic() — current KST month/event boosts priority.
 */
import { pickSeasonalTopic } from "../lib/season-topics.mjs";

export const POST_TOPICS = [
  {
    id: "portable-ac",
    category: "home-appliances",
    imageQuery: "portable air conditioner room",
    liveData: true,
    seasons: ["summer"],
    peakMonths: [6, 7, 8],
    peakMonthBonus: 10,
    seasonBoost: { summer: 12 },
    allowedFormats: [
      "buying-guide",
      "head-to-head",
      "scenario-guide",
      "explainer",
      "checklist",
    ],
    angle:
      "portable air conditioners for apartments: BTU sizing, hose setup, noise, and energy use in summer heat",
  },
  {
    id: "window-ac",
    category: "home-appliances",
    imageQuery: "window air conditioner apartment",
    liveData: true,
    seasons: ["summer"],
    peakMonths: [5, 6, 7, 8],
    peakMonthBonus: 10,
    seasonBoost: { summer: 11 },
    allowedFormats: ["buying-guide", "head-to-head", "scenario-guide", "checklist"],
    angle:
      "window and wall-mounted air conditioners: BTU per room size, install constraints, and efficiency labels",
  },
  {
    id: "wireless-earbuds",
    category: "audio",
    imageQuery: "wireless earbuds technology",
    liveData: true,
    seasons: ["summer", "winter"],
    peakMonths: [11, 12, 6, 7],
    allowedFormats: ["buying-guide", "head-to-head", "explainer", "checklist"],
    angle:
      "budget wireless earbuds comparison with specs, battery, codec, and ANC data",
  },
  {
    id: "budget-smartphones",
    category: "smartphones",
    imageQuery: "smartphone comparison desk",
    liveData: true,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 8, 9],
    peakMonthBonus: 6,
    allowedFormats: ["buying-guide", "head-to-head", "scenario-guide"],
    angle:
      "best budget smartphones under a price tier with chipset, camera, and battery analysis",
  },
  {
    id: "power-banks",
    category: "accessories",
    imageQuery: "portable power bank charger",
    liveData: true,
    seasons: ["summer", "winter"],
    peakMonths: [6, 7, 12, 1],
    allowedFormats: ["buying-guide", "explainer", "checklist"],
    angle:
      "power bank buying guide: capacity, charging speed, port types, and safety certifications",
  },
  {
    id: "mechanical-keyboards",
    category: "peripherals",
    imageQuery: "mechanical keyboard workspace",
    liveData: false,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 9],
    allowedFormats: ["buying-guide", "checklist", "explainer"],
    angle:
      "entry-level mechanical keyboards compared by switch type, layout, and build quality",
  },
  {
    id: "budget-monitors",
    category: "displays",
    imageQuery: "computer monitor desk setup",
    liveData: true,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 8, 9],
    allowedFormats: ["buying-guide", "scenario-guide", "head-to-head"],
    angle:
      "budget monitors for work and gaming: panel type, resolution, refresh rate guide",
  },
  {
    id: "robot-vacuums",
    category: "smart-home",
    imageQuery: "robot vacuum smart home",
    liveData: true,
    seasons: ["spring", "summer"],
    allowedFormats: ["buying-guide", "scenario-guide", "head-to-head"],
    angle:
      "robot vacuum comparison for apartments: suction, mapping, mop features, and maintenance",
  },
  {
    id: "bluetooth-speakers",
    category: "audio",
    imageQuery: "portable bluetooth speaker",
    liveData: true,
    seasons: ["summer"],
    peakMonths: [6, 7, 8],
    allowedFormats: ["buying-guide", "head-to-head", "scenario-guide"],
    angle:
      "portable Bluetooth speakers compared by sound, IP rating, and battery life",
  },
  {
    id: "fitness-trackers",
    category: "wearables",
    imageQuery: "fitness tracker smartwatch",
    liveData: true,
    seasons: ["spring", "winter"],
    peakMonths: [1, 2, 3],
    allowedFormats: ["buying-guide", "head-to-head", "checklist"],
    angle:
      "budget fitness trackers: heart rate accuracy, sleep tracking, and app ecosystem",
  },
  {
    id: "usb-c-hubs",
    category: "accessories",
    imageQuery: "usb c hub laptop",
    liveData: false,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 9],
    allowedFormats: ["buying-guide", "checklist", "explainer"],
    angle:
      "USB-C hub buying guide for laptops: ports, power delivery, and compatibility",
  },
  {
    id: "air-purifiers",
    category: "home-appliances",
    imageQuery: "air purifier modern home",
    liveData: false,
    seasons: ["spring", "summer", "winter"],
    peakMonths: [3, 4, 5, 6],
    peakMonthBonus: 7,
    seasonBoost: { spring: 8, summer: 6 },
    allowedFormats: ["buying-guide", "scenario-guide", "explainer", "checklist"],
    angle:
      "air purifier guide for small rooms: CADR, filter types, noise levels, and running costs",
  },
  {
    id: "dehumidifiers",
    category: "home-appliances",
    imageQuery: "dehumidifier home humidity",
    liveData: false,
    seasons: ["summer"],
    peakMonths: [6, 7, 8, 9],
    peakMonthBonus: 9,
    seasonBoost: { summer: 9 },
    allowedFormats: ["buying-guide", "explainer", "checklist"],
    angle:
      "dehumidifiers for humid summers: pint capacity, noise, and energy cost per day",
  },
  {
    id: "tablet-budget",
    category: "tablets",
    imageQuery: "tablet reading study",
    liveData: true,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 8, 9],
    peakMonthBonus: 8,
    allowedFormats: ["buying-guide", "scenario-guide", "head-to-head"],
    angle:
      "budget tablets for reading and video: display, storage, stylus support comparison",
  },
  {
    id: "webcams",
    category: "peripherals",
    imageQuery: "webcam video conference",
    liveData: false,
    seasons: ["fall", "spring"],
    peakMonths: [2, 3, 9],
    allowedFormats: ["buying-guide", "checklist", "head-to-head"],
    angle:
      "webcams for remote work: resolution, autofocus, microphone quality comparison",
  },
];

/**
 * Pick next topic — season score first, then avoid recent repeats.
 * @param {object} state
 * @param {{ contentProfile?: string }} [options]
 */
export function pickTopic(state, options = {}) {
  const used = new Set(state.usedTopicIds ?? []);
  let candidates = POST_TOPICS.filter((t) => !used.has(t.id));

  if (options.contentProfile) {
    const formatFiltered = candidates.filter(
      (t) => !t.allowedFormats || t.allowedFormats.includes(options.contentProfile),
    );
    if (formatFiltered.length > 0) {
      candidates = formatFiltered;
    }
  }

  if (candidates.length === 0) {
    state.usedTopicIds = [];
    candidates = POST_TOPICS;
    if (options.contentProfile) {
      const formatFiltered = candidates.filter(
        (t) =>
          !t.allowedFormats || t.allowedFormats.includes(options.contentProfile),
      );
      if (formatFiltered.length > 0) candidates = formatFiltered;
    }
  }

  const topic = pickSeasonalTopic(candidates, new Set(), new Date());

  state.topicIndex =
    (POST_TOPICS.findIndex((t) => t.id === topic.id) + 1) % POST_TOPICS.length;
  state.usedTopicIds = [...(state.usedTopicIds ?? []), topic.id].slice(-20);
  return topic;
}

export function getTopicById(id) {
  return POST_TOPICS.find((t) => t.id === id) ?? null;
}
