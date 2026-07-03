# Render Guardian — Phase 2 Plan

**Approved scope:** 5-C (tagline + placement + copy), 6-A (blog meta builder), JSON-LD API wrap.

**Status:** API scaffold created; consumers not yet migrated.

## Target layout

```
lib/guardian/
├── index.ts              ← public API (only import path)
├── types.ts              ← BlogPostGuardianInput, chrome contracts
├── meta.ts               ← buildBlogPostMetadata() ✅ implemented
├── json-ld.ts            ← re-export compose + types ✅ thin wrap
├── article-chrome.ts     ← share/tagline rules + body split ✅ implemented
├── publication-copy.ts   ← tagline strings ✅ moved copy
├── GUARDIAN_CHANGELOG.md
└── check-boundary.ts     ← CI (Phase 2 step 4)
```

## Migration steps (ordered)

### Step 1 — Wire blog post page (low risk) ✅ ready

**File:** `app/[locale]/blog/[slug]/page.tsx`

| Before | After |
| --- | --- |
| Inline `generateMetadata` body (~45 lines) | `buildBlogPostMetadata({ locale, slug, post, breadcrumbLabels })` |
| Direct `@/lib/seo/json-ld/compose` | `@/lib/guardian` JSON-LD exports |

**Impact:** SEO output identical if inputs unchanged. Easier to audit one function.

### Step 2 — ArticleLayout chrome (medium risk)

**File:** `components/article-layout.tsx`

| Before | After |
| --- | --- |
| `splitRelatedGuidesForTagline` from `lib/split-article-content` | `splitArticleBodyForTagline` from `@/lib/guardian` |
| `PublicationTagline` reads `lib/publication-copy` | `getPublicationTagline(locale)` from guardian |
| Hard-coded top/bottom `ArticleShare` | Document via `ARTICLE_CHROME_RULES`; optional `ArticleChrome` wrapper component |

**New optional component:** `components/article-chrome.tsx` (thin) — renders share bars + tagline slot per `ARTICLE_CHROME_RULES`. Keeps layout JSX readable.

**Impact:** Admin preview (`app/admin/preview/[slug]/page.tsx`) uses same `ArticleLayout` — no separate change.

### Step 3 — Deprecated shims (backward compat)

| Shim path | Re-export |
| --- | --- |
| `lib/publication-copy.ts` | `@/lib/guardian/publication-copy` |
| `lib/split-article-content.ts` | `@/lib/guardian/article-chrome` (rename fn alias) |

### Step 4 — Encapsulation (3-C render)

- ESLint `no-restricted-imports` for `lib/seo/json-ld/builders/*`, `lib/seo/json-ld/compose` outside `lib/guardian/`
- `lib/guardian/check-boundary.ts` + `npm run guardian:check-render-boundary`
- Extend `.cursor/rules/guardian.mdc` with `lib/guardian/**` globs

### Step 5 — Out of scope (Phase 2)

| Item | Reason |
| --- | --- |
| Home/about/privacy `generateMetadata` | 6-A scoped to blog posts only |
| `components/site-footer.tsx` tagline | Uses `messages/*/footer` — separate i18n copy |
| `lib/seo/json-ld/builders/*` move | Re-export wrap sufficient (7-B decision) |
| `components/article-protection.tsx` | UX policy, not guardian (9-B) |

## Consumer map

```
app/[locale]/blog/[slug]/page.tsx
  → buildBlogPostMetadata, buildBlogPostJsonLdGraph, buildBlogPostBreadcrumbs

components/article-layout.tsx
  → splitArticleBodyForTagline, getPublicationTagline, ARTICLE_CHROME_RULES

components/publication-tagline.tsx
  → getPublicationTagline

app/admin/preview/[slug]/page.tsx
  → indirect via ArticleLayout
```

## Risk matrix

| Step | Risk | Rollback |
| --- | --- | --- |
| Meta builder | Low | Revert page.tsx import |
| JSON-LD wrap | Low | Shim re-export unchanged output |
| Body split move | Medium | Missing Related guides → tagline not inline (fallback path exists) |
| ESLint boundary | Low | CI fails on bad import only |

## Verification (per step)

1. `npm run build`
2. Spot-check `/en/blog/{slug}` — view-source: canonical, OG, JSON-LD
3. Confirm tagline under Related guides + share bars top/bottom
4. Admin preview matches public layout

## Next action (awaiting approval)

Execute **Step 1 + Step 2** migration in one PR after owner confirms.
