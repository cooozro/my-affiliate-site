import type { Locale } from "@/lib/i18n/config";

const RELATED_HEADING: Record<Locale, string> = {
  en: "## Related guides",
  ko: "## 관련 가이드",
};

export type RelatedGuidesSplit = {
  /** Markdown through the Related guides heading (inclusive). */
  throughHeading: string;
  /** Bullet links and body copy under that heading only. */
  relatedLinks: string;
  /** Remaining sections (checklist, final verdict, etc.). */
  afterRelated: string;
};

/**
 * Split at Related guides so the publication tagline can sit directly under
 * the heading and above the internal link list.
 */
export function splitRelatedGuidesForTagline(
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

/** @deprecated Use splitRelatedGuidesForTagline */
export function splitAfterRelatedGuides(
  content: string,
  locale: Locale,
): { beforeTagline: string; afterTagline: string } | null {
  const split = splitRelatedGuidesForTagline(content, locale);
  if (!split) return null;
  return {
    beforeTagline: `${split.throughHeading}\n\n${split.relatedLinks}`,
    afterTagline: split.afterRelated,
  };
}
