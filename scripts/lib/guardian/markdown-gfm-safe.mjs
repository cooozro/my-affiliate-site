/**
 * GFM (remark-gfm) strikethrough misparses ASCII tilde pairs on one line.
 * e.g. "4~6 ... 4~5" or "~$100 ... $90~$120" renders as <del> between tildes.
 * Replace risky patterns with en-dash or locale "about" wording — preserve ~{{ placeholders.
 */

const PLACEHOLDER_TILDE_RE = /~\{\{[^}]+\}\}/g;

function shieldPlaceholders(text) {
  const placeholders = [];
  const shielded = text.replace(PLACEHOLDER_TILDE_RE, (match) => {
    const token = `\uE000GFM${placeholders.length}\uE001`;
    placeholders.push(match);
    return token;
  });
  return { shielded, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let out = text;
  for (let i = 0; i < placeholders.length; i += 1) {
    out = out.replace(`\uE000GFM${i}\uE001`, placeholders[i]);
  }
  return out;
}

function approxPrefix(locale) {
  return locale === "ko" ? "약 " : "about ";
}

/**
 * @param {string} text
 * @param {{ locale?: string }} [options]
 */
export function repairGfmTildeRanges(text, options = {}) {
  if (!text || !text.includes("~")) return { text, changed: false, count: 0 };

  const locale = options.locale ?? "en";
  const approx = approxPrefix(locale);
  const { shielded, placeholders } = shieldPlaceholders(text);

  let count = 0;
  let fixed = shielded;

  const replace = (re, fn) => {
    fixed = fixed.replace(re, (...args) => {
      count += 1;
      return fn(...args);
    });
  };

  // $90~$120, $0~$250
  replace(/\$(\d[\d,]*)~\$(\d[\d,]*)/g, (_m, a, b) => `$${a}–$${b}`);

  // 4~6, 1~4 (title ranges)
  replace(/(\d)~(\d)/g, (_m, a, b) => `${a}–${b}`);

  // 100갤런/~3개월
  replace(/\/~(\d)/g, (_m, d) => `/약 ${d}`);

  // ~$100 approximate prices
  replace(/~(\$[\d,]+)/g, (_m, amt) => `${approx}${amt}`);

  // ~16인치, ~6–7 (unit approximations)
  replace(/~(\d)/g, (_m, d) => `${approx}${d}`);

  const restored = restorePlaceholders(fixed, placeholders);
  return { text: restored, changed: count > 0, count };
}

/**
 * Detect lines that may render with accidental <del> when parsed with GFM.
 * @param {string} body
 * @returns {string[]}
 */
export function findRiskyGfmTildeLines(body) {
  const risks = [];
  for (const line of body.split("\n")) {
    if (!line.includes("~")) continue;
    const withoutPlaceholders = line.replace(PLACEHOLDER_TILDE_RE, "");
    const tildeCount = (withoutPlaceholders.match(/~/g) ?? []).length;
    if (tildeCount >= 2) {
      risks.push(line.trim().slice(0, 120));
    }
  }
  return risks;
}
