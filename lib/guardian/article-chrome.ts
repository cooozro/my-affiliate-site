/**
 * Render Guardian — article chrome rules (share bar + tagline placement).
 * @see lib/guardian/PHASE2_PLAN.md
 */

import type { Locale } from "@/lib/i18n/config";
import type { ArticleChromeRules, TaglinePlacement } from "@/lib/guardian/types";

export const ARTICLE_CHROME_RULES: ArticleChromeRules = {
  shareBar: {
    placements: ["top", "bottom"],
    required: true,
  },
  tagline: {
    placement: "after-related-heading",
    required: true,
  },
};

const RELATED_HEADING: Record<Locale, string> = {
  en: "## Related guides",
  ko: "## 관련 가이드",
};

export type RelatedGuidesSplit = {
  throughHeading: string;
  relatedLinks: string;
  afterRelated: string;
};

/**
 * Split markdown at Related guides so the publication tagline sits directly under
 * the heading and above the internal link list (5-C contract).
 */
export function splitArticleBodyForTagline(
  content: string,
  locale: Locale,
): RelatedGuidesSplit | null {
  const heading = RELATED_HEADING[locale];
  const lines = content.split("\n");
  let relatedIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === heading) {
      relatedIdx = i;
      break;
    }
  }

  if (relatedIdx === -1) return null;

  let nextSectionIdx = lines.length;
  for (let i = relatedIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      nextSectionIdx = i;
      break;
    }
  }

  const relatedLinks = lines.slice(relatedIdx + 1, nextSectionIdx).join("\n").trim();
  if (!relatedLinks) return null;

  return {
    throughHeading: lines.slice(0, relatedIdx + 1).join("\n"),
    relatedLinks,
    afterRelated: lines.slice(nextSectionIdx).join("\n"),
  };
}

export function assertTaglinePlacement(placement: TaglinePlacement): void {
  const expected = ARTICLE_CHROME_RULES.tagline.placement;
  if (placement !== expected) {
    throw new Error(
      `Render Guardian: tagline must use placement "${expected}", got "${placement}"`,
    );
  }
}
