import type { Locale } from "@/lib/i18n/config";
import type { EnrichedPost } from "@/lib/enrich-post";

/** Input for blog post metadata + JSON-LD from a resolved post. */
export type BlogPostGuardianInput = {
  locale: Locale;
  slug: string;
  post: Pick<
    EnrichedPost,
    | "title"
    | "description"
    | "date"
    | "publishedAt"
    | "updatedAt"
    | "tags"
    | "coverImage"
    | "coverImageAlt"
    | "content"
    | "contentProfile"
    | "noindex"
  >;
  breadcrumbLabels?: {
    home: string;
    articles: string;
  };
};

/** Share bar placement contract (top + bottom). */
export type ArticleSharePlacement = "top" | "bottom";

/** Publication tagline placement relative to Related guides section. */
export type TaglinePlacement = "after-related-heading" | "standalone";

export type ArticleChromeRules = {
  shareBar: {
    placements: readonly ArticleSharePlacement[];
    required: true;
  };
  tagline: {
    placement: TaglinePlacement;
    required: true;
  };
};
