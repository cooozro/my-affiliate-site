# Render Guardian Changelog

## 2026-07-08 — Inline link contextual necessity (Phase 8)

**Changed:** Removed forced in-body cross-links (bluetooth speaker, monitors, anchor CTAs). Related-guides lists trimmed to summer room-air topics only. Prefer link-free prose when the link does not carry the argument.

## 2026-07-08 — Inline contextual links only (Phase 7)

**Removed:** `helpNav` frontmatter injection, `ArticleNavButtons`, `buildArticleBodySegments`, info-box UI. Monetization / cross-links belong **inline in markdown** at natural sentence boundaries.

**Kept:** `headingIdForHelpNav()` for stable `#comparison-table` / `#related-guides` anchors.

**Pipeline:** `helpNav` in frontmatter now fails integrity audit with deprecation message.

## 2026-07-08 — Help nav info-box tone (Phase 6)

**Changed:** Context copy shifted to informational/supplementary tone (no imperative CTAs). Context + link wrapped in `.aipick-nav-btn` info box (`bg-muted/30`, rounded border, serif context + inline text link).

**Demo:** `2026-air-purifiers-guide` — revised KO/EN context strings.

## 2026-07-08 — Help nav contextual injection (Phase 5)

**Changed:** Help buttons inject **inside the article body** at section-aware anchors (`injectAfter: editorial-overview | final-verdict-lead`) with optional `context` bridge copy. Tighter `.aipick-nav-btn` spacing (left border + prose-adjacent margins).

**Files:** `lib/help-nav.ts` (`buildArticleBodySegments`), `components/article-layout.tsx`, `components/article-nav-buttons.tsx`, `scripts/lib/help-nav.mjs`

**Demo:** `2026-air-purifiers-guide` — contextual labels + bridge text after Editorial Overview and Final Verdict lead.

## 2026-07-08 — Help navigation buttons (Plan C render layer)

**Added:** Opt-in `helpNav` frontmatter (max 2: top + bottom) rendered in `article-layout.tsx` via `ArticleNavButtons`. Uses `cta-help:` href scheme; **internal only** (`#anchor` or `/path` — no external/affiliate URLs during AdSense review).

**Files:** `lib/help-nav.ts`, `components/article-nav-buttons.tsx`, `lib/posts.ts`, `scripts/lib/help-nav.mjs`, `data/automation/help-nav-health-baseline.json`, `scripts/help-nav-health-check.mjs`

**Demo:** `2026-air-purifiers-guide` (anchor test: `#comparison-table`, `#related-guides`).

## 2026-07-03 — Phase 2 migration (Steps 1–2 + ESLint boundary)

**Migrated consumers:**

- `app/[locale]/blog/[slug]/page.tsx` → `buildBlogPostMetadata`, `buildBlogPostPageJsonLd`
- `components/article-layout.tsx` → `ARTICLE_CHROME_RULES`, `splitArticleBodyForTagline`
- `components/publication-tagline.tsx` → `getPublicationTagline`

**Shims:** `lib/publication-copy.ts`, `lib/split-article-content.ts`

**Encapsulation:** ESLint render rules + `npm run guardian:check-render-boundary`

## 2026-07-03 — Phase 2 scaffold (plan only)

**Approved:** 5-C, 6-A (blog meta), JSON-LD wrap, 11-B sequencing.

**Created:**

- `lib/guardian/index.ts` — public API surface
- `lib/guardian/meta.ts` — `buildBlogPostMetadata()` (not yet wired to page)
- `lib/guardian/json-ld.ts` — thin wrap over `lib/seo/json-ld/compose`
- `lib/guardian/article-chrome.ts` — `ARTICLE_CHROME_RULES`, `splitArticleBodyForTagline()`
- `lib/guardian/publication-copy.ts` — tagline strings

**Not migrated yet:** `page.tsx`, `article-layout.tsx`, shims, ESLint render boundary.

**Impact when migrated:** See `PHASE2_PLAN.md`.
