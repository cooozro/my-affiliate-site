<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Content authoring

Before writing or editing blog posts, read **`docs/CONTENT_STANDARDS.md`**.

Summary:

1. Follow Google content quality guidelines (original, helpful, verifiable).
2. No ad placeholders/scripts in posts; at least one image per article; run `npm run content:validate`.
3. SEO: unique title/description, en+ko locales, use `liveData` placeholders instead of hardcoded FX/dates.

Placeholders for live posts: `{{today}}`, `{{today_locale}}`, `{{usd_krw_rate}}`, `{{krw:29.99}}`.

Images: `npm run content:image` with `PEXELS_API_KEY` (Pexels free API).

## Blog automation

Scheduled publishing and Google Search Console indexing via GitHub Actions. See **`docs/BLOG_AUTOMATION.md`**.

- **Writing:** Cursor (요미) — `draft: true`, **not** OpenAI API
- **Publishing:** GHA every 15 min check, 4–6h random gaps, 2/day KST cap
- **Replenish:** GitHub Actions runs `run-cursor-replenish.mjs` with Cursor SDK (`CURSOR_API_KEY`)
- **Buffer:** Always keep 2 drafts ready
- Commands: `npm run automation:status`, `automation:publish`, `automation:replenish`

### Draft replenish priority (local IDE only)

When editing in Cursor and `cursor-draft-request.json` is `pending`, you may write the draft manually instead of waiting for GHA.

Buying-guide body format: **`docs/templates/`** by `contentProfile` (see `scripts/lib/content-profiles.mjs`). Season-first topic pick: **`scripts/lib/season-topics.mjs`**.
