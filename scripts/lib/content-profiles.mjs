/**
 * Content profile definitions and format rotation for AI Pick & Report.
 *
 * Public auto-write profiles (templates in docs/templates/):
 *   buying-guide | head-to-head | scenario-guide | explainer | checklist
 *
 * Admin / internal only (not in auto replenish deck):
 *   editorial — SEO audit report, welcome, etc.
 *
 * Rotation: equal round-robin shuffle deck — each profile once per cycle,
 * then reshuffle (no buying-guide overweight).
 */

export const CONTENT_PROFILES = [
  "buying-guide",
  "head-to-head",
  "scenario-guide",
  "explainer",
  "checklist",
];

/** @deprecated Prefer round-robin deck; kept equal weights for any legacy callers. */
export const FORMAT_ROTATION_WEIGHTS = CONTENT_PROFILES.map((profile) => ({
  profile,
  weight: 1,
}));

export const PROFILE_TEMPLATE_PATHS = {
  "buying-guide": "docs/templates/buying-guide.md",
  "head-to-head": "docs/templates/head-to-head.md",
  "scenario-guide": "docs/templates/scenario-guide.md",
  explainer: "docs/templates/explainer.md",
  checklist: "docs/templates/checklist.md",
  editorial: "docs/templates/editorial.md",
};

export const PROFILE_MIN_BODY_CHARS = {
  "buying-guide": 2500,
  "head-to-head": 2500,
  /** Scenario guides need named picks per use case — longer than generic floor. */
  "scenario-guide": 4500,
  explainer: 2500,
  checklist: 2500,
  editorial: 800,
};

/** Minimum characters inside each ## Scenario / ## 시나리오 section body. */
export const MIN_SCENARIO_SECTION_CHARS = 400;

/** Publish gate: Korean body character count (not a ratio to English). */
export const MIN_KO_BODY_CHARS = 2500;

/** Publish gate: English body UTF-8 byte length. */
export const MIN_EN_BODY_BYTES = 5000;

function shuffleCopy(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Pick next content profile via equal round-robin.
 * Maintains `state.formatDeck`: when empty, reshuffles all CONTENT_PROFILES.
 * Avoids consecutive duplicate across deck boundaries when possible.
 */
export function pickContentProfile(state) {
  const history = state.formatHistory ?? [];
  const last = history[history.length - 1];

  let deck = Array.isArray(state.formatDeck)
    ? state.formatDeck.filter((p) => CONTENT_PROFILES.includes(p))
    : [];

  if (deck.length === 0) {
    deck = shuffleCopy(CONTENT_PROFILES);
    // Prefer not starting a new cycle with the same profile as the last write.
    if (deck.length > 1 && deck[0] === last) {
      const swapWith = deck.findIndex((p, idx) => idx > 0 && p !== last);
      if (swapWith > 0) {
        const tmp = deck[0];
        deck[0] = deck[swapWith];
        deck[swapWith] = tmp;
      }
    }
  }

  const profile = deck.shift() ?? "buying-guide";
  state.formatDeck = deck;
  state.formatHistory = [...history, profile].slice(-30);
  return profile;
}

export function recordContentProfile(state, profile) {
  if (!CONTENT_PROFILES.includes(profile)) return;
  const history = state.formatHistory ?? [];
  if (history[history.length - 1] === profile) return;
  state.formatHistory = [...history, profile].slice(-30);
  // Keep deck consistent if something recorded a profile outside pickContentProfile.
  if (Array.isArray(state.formatDeck)) {
    state.formatDeck = state.formatDeck.filter((p) => p !== profile);
  }
}

export function getTemplatePath(profile) {
  return (
    PROFILE_TEMPLATE_PATHS[profile] ?? PROFILE_TEMPLATE_PATHS["buying-guide"]
  );
}

export function isValidContentProfile(profile) {
  return CONTENT_PROFILES.includes(profile) || profile === "editorial";
}

/** Human-readable target mix (equal share after round-robin). */
export function describeFormatRotation() {
  const n = CONTENT_PROFILES.length;
  const pct = Math.round(100 / n);
  return CONTENT_PROFILES.map((p) => `${p} ~${pct}%`).join(", ");
}
