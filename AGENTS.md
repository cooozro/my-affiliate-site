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
