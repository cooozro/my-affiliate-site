# Render Guardian Changelog

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
