/**
 * Cross-cutting content angles — beyond single product taxonomy.
 * Price tiers, household types, capacity bands, and seasonal bundles.
 */

import { getCurrentSeason } from "./season-topics.mjs";

export const ANGLE_TYPES = {
  PRICE_TIER: "price-tier-cross",
  HOUSEHOLD: "household-type",
  CAPACITY: "capacity-tier",
  USE_CASE_BUNDLE: "use-case-bundle",
};

/** @typedef {{
 *   id: string,
 *   type: string,
 *   label: { en: string, ko: string },
 *   angle: string,
 *   searchKeyword: string,
 *   slugStem: string,
 *   anchorTopicIds: string[],
 *   category: string,
 *   topicCluster: string,
 *   imageQuery: string,
 *   imageSearchKeywords?: string[],
 *   liveData?: boolean,
 *   seasons?: string[],
 *   allowedFormats: string[],
 *   benchmarkOutline: { sections: Array<{ h2: string, h3?: string[] }> },
 *   priceTierUsd?: number,
 *   household?: string,
 * }} MetaContentAngle */

/** @type {MetaContentAngle[]} */
export const META_CONTENT_ANGLES = [
  {
    id: "solo-apartment-essentials",
    type: ANGLE_TYPES.HOUSEHOLD,
    household: "solo",
    label: { en: "Single-person apartment", ko: "1인 가구" },
    angle:
      "Cross-category starter essentials for one-person apartments: compact cooling, air quality, desk tech, and quick meals without full-size appliance sprawl",
    searchKeyword:
      "single person apartment essential appliances buying guide 2026",
    slugStem: "solo-apartment-home-essentials",
    anchorTopicIds: [
      "electric-fans",
      "air-purifiers",
      "air-fryers",
      "wireless-earbuds",
      "robot-vacuums",
    ],
    category: "cross-cutting",
    topicCluster: "household-solo",
    imageQuery: "small apartment living room essentials",
    imageSearchKeywords: ["small apartment", "studio essentials", "compact home"],
    liveData: true,
    seasons: ["summer", "spring", "fall", "winter"],
    allowedFormats: ["scenario-guide", "buying-guide", "checklist"],
    benchmarkOutline: {
      sections: [
        {
          h2: "Who this cross-category guide is for",
          h3: [
            "Studio vs one-bedroom floor plans",
            "What one person actually uses daily",
            "Summer closed-window living constraints",
          ],
        },
        {
          h2: "Scenario: Cooling and airflow without central AC",
          h3: [
            "Window vs portable vs fan-only tradeoffs",
            "Recommended category pick with model example",
            "Runner-up when install rules block hardware",
          ],
        },
        {
          h2: "Scenario: Air quality in a sealed small space",
          h3: ["CADR fit for 15–25 m²", "Filter cost per year", "Noise at sleep speed"],
        },
        {
          h2: "Scenario: Desk tech and commute audio",
          h3: ["WFH webcam and hub basics", "Earbuds for transit sweat", "Power bank sizing"],
        },
        {
          h2: "Scenario: Meals without a full kitchen lineup",
          h3: ["Air fryer vs rice cooker footprint", "Circuit load beside a fan or AC"],
        },
        {
          h2: "Scenario: Floor care with minimal storage",
          h3: ["Robot vs stick for studio clutter", "Dock size and maintenance"],
        },
        {
          h2: "Quick cross-category comparison table",
          h3: ["Category", "Best solo pick", "Skip if"],
        },
        {
          h2: "FAQ",
          h3: [
            "Can one fan replace AC in a studio?",
            "Which two categories to buy first on a tight budget?",
            "How many amps does a solo apartment circuit share?",
          ],
        },
        {
          h2: "Final Verdict",
          h3: ["Buy if", "Skip if"],
        },
      ],
    },
  },
  {
    id: "under-300-cross-category",
    type: ANGLE_TYPES.PRICE_TIER,
    priceTierUsd: 300,
    label: { en: "Under $300 cross-category", ko: "30만 원대 교차 카테고리" },
    angle:
      "Best value picks under $300 across unrelated categories — compare what each product class delivers at the same price ceiling",
    searchKeyword:
      "best home tech under 300 dollars cross category comparison 2026",
    slugStem: "under-300-cross-category",
    anchorTopicIds: [
      "budget-monitors",
      "electric-fans",
      "power-banks",
      "bluetooth-speakers",
      "air-purifiers",
    ],
    category: "cross-cutting",
    topicCluster: "price-tier-300",
    imageQuery: "budget home tech gadgets desk",
    imageSearchKeywords: ["budget gadgets", "home tech desk", "affordable electronics"],
    liveData: true,
    seasons: ["summer", "spring", "fall", "winter"],
    allowedFormats: ["buying-guide", "head-to-head", "scenario-guide"],
    benchmarkOutline: {
      sections: [
        {
          h2: "Why compare across categories at one price ceiling",
          h3: [
            "Opportunity cost when every aisle hits $299",
            "What $300 buys in 2026 vs last year",
            "Methodology: public specs only",
          ],
        },
        {
          h2: "TOP 5 cross-category picks at or under $300",
          h3: ["Ranked table with category column", "Reference MSRP as of {{today}}"],
        },
        {
          h2: "Category deep dive: Display and desk",
          h3: ["Monitor panel and ergonomics", "Analysis takeaway"],
        },
        {
          h2: "Category deep dive: Comfort and climate",
          h3: ["Fan CFM per watt", "Purifier CADR per dollar"],
        },
        {
          h2: "Category deep dive: Mobile and audio",
          h3: ["Power bank Wh per dollar", "Speaker IP rating and runtime"],
        },
        {
          h2: "Scenario matrix: which $300 pick for which life situation",
          h3: ["WFH upgrade", "Summer heat", "Travel season", "Dorm or studio"],
        },
        {
          h2: "FAQ",
          h3: [
            "Is one $300 monitor better than five $60 gadgets?",
            "How to split $300 across two categories",
            "When to wait for a sale on one flagship vs two budget picks",
          ],
        },
        {
          h2: "Five checks before you buy at this tier",
        },
        {
          h2: "Final Verdict",
          h3: ["Buy if", "Skip if"],
        },
      ],
    },
  },
  {
    id: "newlywed-couple-starter",
    type: ANGLE_TYPES.HOUSEHOLD,
    household: "couple",
    label: { en: "Newlywed couple starter home", ko: "신혼 부부" },
    angle:
      "First-home appliance and tech priorities for couples: shared kitchen, dual WFH desks, laundry rhythm, and guest-ready comfort",
    searchKeyword: "newlywed couple home appliances starter guide 2026",
    slugStem: "newlywed-home-starter",
    anchorTopicIds: [
      "refrigerators",
      "washing-machines",
      "coffee-machines",
      "budget-monitors",
      "robot-vacuums",
    ],
    category: "cross-cutting",
    topicCluster: "household-couple",
    imageQuery: "modern couple kitchen apartment",
    liveData: false,
    seasons: ["spring", "fall"],
    allowedFormats: ["scenario-guide", "buying-guide", "checklist"],
    benchmarkOutline: {
      sections: [
        { h2: "Introduction: two incomes, one floor plan", h3: ["Kitchen vs living priority", "Guest season timing"] },
        { h2: "Scenario: Shared kitchen without oversizing", h3: ["Fridge capacity for two", "Coffee ritual footprint"] },
        { h2: "Scenario: Laundry rhythm for two workers", h3: ["Drum size and noise", "Humid indoor drying"] },
        { h2: "Scenario: Dual desk and entertainment", h3: ["Monitor pair vs one ultrawide", "Vacuum for pet-free couple"] },
        { h2: "Quick comparison table" },
        { h2: "FAQ", h3: ["Buy together or stagger purchases?", "Wedding registry vs cash budget"] },
        { h2: "Final Verdict" },
      ],
    },
  },
  {
    id: "family-3-5-person",
    type: ANGLE_TYPES.HOUSEHOLD,
    household: "family-3-5",
    label: { en: "3–5 person household", ko: "3~5인 가구" },
    angle:
      "Capacity-first cross-category guide for families: larger fridge and washer tiers, shared screens, air quality for kids rooms, and cleanup load",
    searchKeyword: "family home appliances 3 to 5 people buying guide",
    slugStem: "family-3-5-home-essentials",
    anchorTopicIds: [
      "refrigerators",
      "washing-machines",
      "television",
      "air-purifiers",
      "cordless-vacuums",
    ],
    category: "cross-cutting",
    topicCluster: "household-family",
    imageQuery: "family living room home appliances",
    liveData: false,
    seasons: ["spring", "summer", "fall"],
    allowedFormats: ["scenario-guide", "buying-guide"],
    benchmarkOutline: {
      sections: [
        { h2: "Introduction: capacity beats feature count", h3: ["School break load", "Shared bathroom humidity"] },
        { h2: "Scenario: Cold storage and meal batching", h3: ["French door vs side-by-side", "Energy label at full load"] },
        { h2: "Scenario: Laundry throughput", h3: ["kg capacity per person", "Spin noise near kids rooms"] },
        { h2: "Scenario: Shared screen and air quality", h3: ["TV size vs viewing distance", "Purifier per bedroom vs whole home"] },
        { h2: "Scenario: Daily floor care", h3: ["Stick vs robot for crumbs and pet hair"] },
        { h2: "FAQ" },
        { h2: "Final Verdict" },
      ],
    },
  },
  {
    id: "compact-footprint-appliances",
    type: ANGLE_TYPES.CAPACITY,
    label: { en: "Compact footprint across categories", ko: "소형·컴팩트 제품군" },
    angle:
      "Depth, width, and liter-or-cu-ft comparisons across categories when counter space and closet storage are the limiting factor",
    searchKeyword: "compact small apartment appliances size comparison guide",
    slugStem: "compact-footprint-cross-category",
    anchorTopicIds: [
      "portable-ac",
      "air-fryers",
      "dehumidifiers",
      "robot-vacuums",
      "rice-cookers",
    ],
    category: "cross-cutting",
    topicCluster: "capacity-compact",
    imageQuery: "compact appliances small kitchen",
    liveData: false,
    seasons: ["summer", "spring"],
    allowedFormats: ["head-to-head", "scenario-guide", "checklist"],
    benchmarkOutline: {
      sections: [
        { h2: "How we measure footprint fairly", h3: ["Depth vs width vs height", "Vent clearance rules"] },
        { h2: "Compact cooling and moisture", h3: ["Portable AC hose path", "Dehumidifier pint per liter of tank"] },
        { h2: "Compact cooking", h3: ["Air fryer basket liters", "Rice cooker inner pot diameter"] },
        { h2: "Compact cleaning", h3: ["Robot dock depth", "Storage when not in use"] },
        { h2: "Comparison table: liters, inches, and daily usability" },
        { h2: "FAQ" },
        { h2: "Final Verdict" },
      ],
    },
  },
  {
    id: "summer-heat-bundle",
    type: ANGLE_TYPES.USE_CASE_BUNDLE,
    label: { en: "Summer heat-season bundle", ko: "여름 폭염 번들" },
    angle:
      "Cross-category summer stack: cooling, dehumidifying, hydration, and low-heat cooking when windows stay closed for weeks",
    searchKeyword: "summer heat wave home essentials cooling dehumidifier fan guide",
    slugStem: "summer-heat-home-bundle",
    anchorTopicIds: [
      "electric-fans",
      "dehumidifiers",
      "water-purifiers",
      "air-fryers",
      "portable-ac",
    ],
    category: "cross-cutting",
    topicCluster: "season-summer-bundle",
    imageQuery: "summer home cooling fan apartment",
    liveData: true,
    seasons: ["summer"],
    allowedFormats: ["scenario-guide", "checklist", "buying-guide"],
    benchmarkOutline: {
      sections: [
        { h2: "Editorial overview: closed-window summer weeks", h3: ["Tiered electricity", "Humidity plus heat"] },
        { h2: "Layer 1: Active cooling choices", h3: ["Fan vs portable vs window"] },
        { h2: "Layer 2: Moisture control", h3: ["When AC is not enough", "Drain paths"] },
        { h2: "Layer 3: Hydration and low-heat meals", h3: ["Countertop water", "Air fryer vs stove heat load"] },
        { h2: "Bundle checklist before peak season" },
        { h2: "FAQ" },
        { h2: "Final Verdict" },
      ],
    },
  },
];

const ANGLE_BY_ID = new Map(META_CONTENT_ANGLES.map((a) => [a.id, a]));

export function getMetaAngleById(id) {
  return ANGLE_BY_ID.get(id) ?? null;
}

export function isMetaTopicId(topicId) {
  return (
    typeof topicId === "string" &&
    (topicId.startsWith("meta-") || ANGLE_BY_ID.has(topicId.replace(/^meta-/, "")))
  );
}

/**
 * Shim meta angle into topic-shaped object for strategy / prompts / images.
 * @param {MetaContentAngle} angle
 */
export function metaAngleToTopic(angle) {
  return {
    id: `meta-${angle.id}`,
    category: angle.category,
    topicCluster: angle.topicCluster,
    angle: angle.angle,
    imageQuery: angle.imageQuery,
    imageSearchKeywords: angle.imageSearchKeywords ?? [angle.imageQuery],
    searchKeyword: angle.searchKeyword,
    liveData: angle.liveData ?? false,
    seasons: angle.seasons ?? ["summer"],
    allowedFormats: angle.allowedFormats,
    isMetaAngle: true,
    metaAngle: angle,
    anchorTopicIds: angle.anchorTopicIds,
    slugStem: angle.slugStem,
  };
}

export function listMetaAnglesForSeason(season = getCurrentSeason()) {
  return META_CONTENT_ANGLES.filter(
    (a) => !a.seasons?.length || a.seasons.includes(season),
  );
}

export function suggestedSlugForAngle(angle, contentProfile, year = new Date().getFullYear()) {
  const profileShort = String(contentProfile ?? "guide").replace(/-guide$/, "");
  return `${year}-${angle.slugStem}-${profileShort}-guide`;
}
