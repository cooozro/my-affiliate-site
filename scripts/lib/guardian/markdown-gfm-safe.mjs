/**
 * GFM (remark-gfm) strikethrough misparses ASCII tilde in numeric ranges.
 * e.g. "4~6 ... 4~5" renders as strikethrough between tildes.
 * Replace digit~digit with en-dash (U+2013) — preserves ~{{ liveData placeholders.
 */

/** @param {string} text */
export function repairGfmTildeRanges(text) {
  if (!text || !text.includes("~")) return { text, changed: false, count: 0 };

  let count = 0;
  const fixed = text.replace(/(\d)~(\d)/g, (_match, a, b) => {
    count += 1;
    return `${a}–${b}`;
  });

  return { text: fixed, changed: count > 0, count };
}

/**
 * Detect lines that may render with accidental <del> when parsed with GFM.
 * Heuristic: two or more digit~digit patterns on the same line.
 * @param {string} body
 * @returns {string[]}
 */
export function findRiskyGfmTildeLines(body) {
  const risks = [];
  for (const line of body.split("\n")) {
    if (!line.includes("~")) continue;
    const rangeTildes = line.match(/\d~\d/g);
    if (rangeTildes && rangeTildes.length >= 2) {
      risks.push(line.trim().slice(0, 120));
    }
  }
  return risks;
}
