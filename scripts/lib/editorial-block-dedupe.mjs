/**
 * Collapse accidental repeated editorial / padding blocks in markdown bodies.
 * Used by publish-integrity repair + ops repair scripts so length-padding
 * never re-emits the same "**편집부 해석:**" / "**Editorial read:**" stump.
 */

/** Stock KO stump previously used to pad KO char counts (must appear at most once). */
export const STOCK_KO_EDITORIAL_STUMP =
  "**편집부 해석:** 실사용 기준으로 스펙 표와 FAQ를 교차 검증했으며, 총 소유 비용(액세서리·보호필름 3년)도 함께 고려했습니다.";

/** Stock EN stump (if ever used for padding). */
export const STOCK_EN_EDITORIAL_STUMP =
  "**Editorial read:** Spec tables and FAQs were cross-checked against real-world use; three-year total cost of ownership (accessories / screen protectors) is included.";

const STOCK_STUMPS = [STOCK_KO_EDITORIAL_STUMP, STOCK_EN_EDITORIAL_STUMP];

function normalizeParagraph(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Drop consecutive identical paragraphs (blank-line separated).
 * @returns {{ body: string, removed: number }}
 */
export function collapseConsecutiveDuplicateParagraphs(body) {
  const raw = String(body ?? "");
  const parts = raw.split(/\n{2,}/);
  const out = [];
  let removed = 0;
  let lastNorm = null;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const norm = normalizeParagraph(trimmed);
    if (lastNorm !== null && norm === lastNorm) {
      removed += 1;
      continue;
    }
    out.push(trimmed);
    lastNorm = norm;
  }

  const next = out.join("\n\n");
  // Preserve a trailing newline style similar to callers that trim later.
  return { body: next, removed };
}

/**
 * Keep the first occurrence of known stock editorial stumps; drop later copies
 * even if non-adjacent (length-pad loops).
 * @returns {{ body: string, removed: number }}
 */
export function collapseStockEditorialStumps(body) {
  let next = String(body ?? "");
  let removed = 0;

  for (const stump of STOCK_STUMPS) {
    const normStump = normalizeParagraph(stump);
    const parts = next.split(/\n{2,}/);
    const out = [];
    let seen = false;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (normalizeParagraph(trimmed) === normStump) {
        if (seen) {
          removed += 1;
          continue;
        }
        seen = true;
      }
      out.push(trimmed);
    }
    next = out.join("\n\n");
  }

  return { body: next, removed };
}

/**
 * Full sanitize pass for draft/publish repair.
 * @returns {{ body: string, changed: boolean, repairs: string[] }}
 */
export function dedupeEditorialBlocks(body, { label = "body" } = {}) {
  const repairs = [];
  let next = String(body ?? "");

  const consecutive = collapseConsecutiveDuplicateParagraphs(next);
  if (consecutive.removed > 0) {
    next = consecutive.body;
    repairs.push(
      `${label}: removed ${consecutive.removed} consecutive duplicate paragraph(s)`,
    );
  }

  const stock = collapseStockEditorialStumps(next);
  if (stock.removed > 0) {
    next = stock.body;
    repairs.push(
      `${label}: removed ${stock.removed} repeated stock editorial stump(s)`,
    );
  }

  return {
    body: next,
    changed: repairs.length > 0,
    repairs,
  };
}

/**
 * Count consecutive duplicate paragraph pairs (for integrity verify).
 */
export function countConsecutiveDuplicateParagraphs(body) {
  return collapseConsecutiveDuplicateParagraphs(body).removed;
}
