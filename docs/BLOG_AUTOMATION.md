# Blog automation

Automated draft writing, publishing, and Google Search Console indexing for AI Pick & Report.

## Schedule (Korea Standard Time) — Plan A (Cursor writes, automation publishes)

| KST | Task | Script |
| --- | --- | --- |
| 11:00 | 발행 1건 | `publish-slot` |
| 17:00 | 발행 1건 (6h+ gap) | `publish-slot` |

**Writing** is done in **Cursor** (`draft: true`). GitHub Actions only publishes and requests Google indexing.

## Rules

- **작성:** 하루 최대 2건 (오전·오후 각 1건)
- **발행:** 하루 최대 2건, 건당 **6시간 이상** 간격
- **임시 보관(draft):** 항상 **2건** 유지 — 발행 후 **Cursor(형님·요미)** 가 새 글 작성
- **콘텐츠 기준:** `docs/CONTENT_STANDARDS.md` (구글 가이드 · 애드센스 · SEO)

## Topics / categories

Rotating pool in `scripts/automation/topics.mjs`:

- audio (earbuds, speakers)
- smartphones, tablets
- accessories (power banks, USB-C hubs)
- peripherals (keyboards, webcams, monitors)
- smart-home, wearables, home-appliances

## Setup (one-time)

### 1. GitHub Secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Required | Purpose |
| --- | --- | --- |
| `PEXELS_API_KEY` | Yes (for cover images via script) | Cover images |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Recommended | Indexing API URL submit |
| `OPENAI_API_KEY` | No (Plan A) | Only if using full auto-write mode |

### 2. GitHub Variables (optional)

| Variable | Default |
| --- | --- |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.aipick.shop` |

### 3. Google Search Console Indexing API

1. [Google Cloud Console](https://console.cloud.google.com/) → create project
2. Enable **Web Search Indexing API**
3. Create **Service Account** → download JSON key
4. Search Console → Settings → Users → add service account email as **Owner**
5. Paste full JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` secret

Without GSC credentials, posts still publish; indexing is skipped with a warning.

### 4. Initial draft buffer

Before the first publish cron, seed 2 drafts:

```bash
npm run automation:buffer
# repeat if needed, or run twice via GitHub Actions → workflow_dispatch → buffer
```

Or run **workflow_dispatch → buffer** twice in GitHub Actions UI.

## Local commands

```bash
npm run automation:status   # queue & daily counters
npm run automation:write    # generate 1 draft
npm run automation:publish  # publish oldest draft
npm run automation:buffer   # fill drafts up to 2
```

Requires `.env.local` with the same keys as GitHub Secrets.

## How it works

```
write-morning/evening → OpenAI (en+ko markdown) → Pexels cover → draft: true
publish-slot          → oldest draft → draft: false → GSC Indexing API (en+ko URLs)
                      → sitemap ping → refill buffer to 2 drafts
```

Files changed are committed by GitHub Actions → Vercel redeploys on push.

## Manual override

GitHub → Actions → **Blog automation** → **Run workflow** → choose task.

## Validation

Before publish, `validatePostFiles` runs a **Google content self-audit** (2,500+ chars, methodology + conclusion sections, comparison table, checklist, cover image). Thin or template-only drafts are rejected. Published posts are also checked by `npm run content:validate` on CI.
