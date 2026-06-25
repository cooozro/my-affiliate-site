# Content Standards — AI Pick & Report

Absolute rules for every article. Agents and authors must follow these before publishing.

## 1. Google Content Guidelines (mandatory)

- Write **original, helpful, people-first** content — not SEO filler or copied manufacturer copy.
- Cite **verifiable specs and sources**; state methodology when comparing products.
- No misleading claims, clickbait titles, or thin affiliate-only pages.
- Match the promise of the title in the body (E-E-A-T: experience, expertise, authority, trust).

Reference: [Google Search Essentials](https://developers.google.com/search/docs/essentials)

## 2. AdSense approval safety (mandatory)

**Do NOT include in markdown:**

- Ad placeholders (`<!-- ad-break -->`, “광고 영역”, empty ad divs)
- AdSense / `googlesyndication` script snippets in posts
- Fake “sponsored” blocks or excessive commercial CTAs before approval

**Do include:**

- At least **one real image** per published post (`coverImage` or inline `![alt](url)`)
- Proper **image alt text** and **photographer credit** (Pexels/Unsplash license)
- About, Contact, Privacy pages (already on site)
- Substantive body (**2,500+ characters** per locale for publish)

Run before commit: `npm run content:validate`

## 3. SEO & indexing (mandatory)

- Unique `title` and `description` (description ≥ 50 chars) per locale
- Both **`en.md` and `ko.md`** for every public post
- Semantic headings (`##`, `###`), tables for comparisons, internal links where natural
- No keyword stuffing; write for readers first
- Use `liveData: true` + placeholders when prices/dates must stay current (see below)

Goal: indexable, high-quality informational pages — avoid thin content, duplicate locale bodies, and outdated hardcoded FX.

---

## Live data placeholders

For posts with `liveData: true` in frontmatter, the site resolves at render time (hourly refresh):

| Placeholder | Example output |
| --- | --- |
| `{{today}}` | June 25, 2026 |
| `{{today_ko}}` | 2026년 6월 25일 |
| `{{today_locale}}` | Locale-aware date |
| `{{usd_krw_rate}}` | Current USD/KRW (Frankfurter API) |
| `{{krw:28.9}}` | USD → KRW at live rate |

A data disclaimer is shown automatically below the cover image.

**Do not hardcode exchange rates or “as of” dates** in `liveData` posts.

---

## Images (free, legal)

### Recommended: Pexels API

1. Free key: https://www.pexels.com/api/
2. Set `PEXELS_API_KEY` in `.env.local`
3. Run:

```bash
npm run content:image -- --slug=my-post-slug --query="wireless earbuds" --locale=en
```

Repeat with `--locale=ko` if alt text should differ (or edit `coverImageAlt` manually).

Images are saved to `public/images/posts/{slug}/cover.jpg` and referenced in frontmatter.

### Frontmatter fields

```yaml
coverImage: "/images/posts/my-slug/cover.jpg"
coverImageAlt: "Descriptive alt text for accessibility and SEO"
coverImageCredit: "Photo by Name / Pexels"
liveData: true   # optional, for FX/date placeholders
```

### Note on prior “blog automation” server

This Next.js repo does **not** include the SSH blog automation stack or its image API. Use the **Pexels script above** (or manually download from Pexels/Unsplash with attribution). Same free-license model.

---

## New post checklist

1. Create `content/posts/{slug}/en.md` and `ko.md`
2. Add cover image (`npm run content:image` or manual)
3. Use `liveData` + placeholders if prices/dates matter
4. `npm run content:validate`
5. `npm run build`
