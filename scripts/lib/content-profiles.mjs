/**
 * Content profile definitions and format rotation for AI Pick & Report.
 * Profiles: buying-guide | head-to-head | scenario-guide | explainer | checklist
 */

export const CONTENT_PROFILES = [
  "buying-guide",
  "head-to-head",
  "scenario-guide",
  "explainer",
  "checklist",
];

/** Target mix per 10 posts: 4 / 2 / 2 / 1 / 1 */
export const FORMAT_ROTATION_WEIGHTS = [
  { profile: "buying-guide", weight: 4 },
  { profile: "head-to-head", weight: 2 },
  { profile: "scenario-guide", weight: 2 },
  { profile: "explainer", weight: 1 },
  { profile: "checklist", weight: 1 },
];

export const PROFILE_TEMPLATE_PATHS = {
  "buying-guide": "docs/templates/buying-guide.md",
  "head-to-head": "docs/templates/head-to-head.md",
  "scenario-guide": "docs/templates/scenario-guide.md",
  explainer: "docs/templates/explainer.md",
  checklist: "docs/templates/checklist.md",
};

export const PROFILE_MIN_BODY_CHARS = {
  "buying-guide": 2500,
  "head-to-head": 2400,
  "scenario-guide": 2400,
  explainer: 2200,
  checklist: 2200,
  editorial: 800,
};

/** Korean body should stay close to English depth (bilingual quality gate). */
export const MIN_KO_TO_EN_BODY_RATIO = 0.75;

/**
 * Pick next content profile using weighted rotation.
 * Avoid repeating the same profile twice in a row when alternatives exist.
 */
export function pickContentProfile(state) {
  const history = state.formatHistory ?? [];
  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];

  const blocked = new Set([last, secondLast].filter(Boolean));

  const pool = [];
  for (const { profile, weight } of FORMAT_ROTATION_WEIGHTS) {
    for (let i = 0; i < weight; i++) {
      pool.push(profile);
    }
  }

  let candidates = pool.filter((p) => !blocked.has(p));
  if (candidates.length === 0) {
    candidates = pool.filter((p) => p !== last);
  }
  if (candidates.length === 0) {
    candidates = [...CONTENT_PROFILES];
  }

  const profile =
    candidates[Math.floor(Math.random() * candidates.length)] ?? "buying-guide";

  state.formatHistory = [...history, profile].slice(-20);
  return profile;
}

export function recordContentProfile(state, profile) {
  if (!CONTENT_PROFILES.includes(profile)) return;
  const history = state.formatHistory ?? [];
  if (history[history.length - 1] === profile) return;
  state.formatHistory = [...history, profile].slice(-20);
}

export function getTemplatePath(profile) {
  return PROFILE_TEMPLATE_PATHS[profile] ?? PROFILE_TEMPLATE_PATHS["buying-guide"];
}

export function isValidContentProfile(profile) {
  return CONTENT_PROFILES.includes(profile) || profile === "editorial";
}
