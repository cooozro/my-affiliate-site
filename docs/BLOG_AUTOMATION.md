# Blog automation

Automated draft writing, publishing, and Google Search Console indexing for AI Pick & Report.

## 24/7 cloud scheduler (PC off — no VPS required)

Publishing runs on **GitHub Actions** servers, not on your PC or the Next.js app.

| What | Where it runs |
| --- | --- |
| Cron schedule (KST 11:00 & 17:00) | GitHub Actions (`ubuntu-latest`) |
| `publish-slot` script | Same workflow job |
| Git commit + push | GitHub → triggers Vercel redeploy |

**Requirements:** GitHub repo with Actions enabled, secrets configured, default branch not blocked for `blog-automation[bot]` pushes.

Next.js / Vercel **cannot** run this cron by itself — there is no always-on Node process in this repo. A VPS cron is optional only if you want a backup trigger; it is **not** needed when this workflow is active.

## Schedule (Korea Standard Time) — Plan A (Cursor writes, automation publishes)

| Rule | Value |
| --- | --- |
| Cron check | Every **15 minutes** (GitHub Actions) |
| Publish times | **Random** — not fixed 11:00 / 17:00 |
| Gap between publishes | **4–6 hours** (random per slot) |
| First slot of KST day | Random jitter **15–120 min** after midnight |
| Daily cap | Max **2** publishes per KST day |

`data/automation/state.json` stores `nextPublishAt` (UTC ISO). Admin shows the next slot in KST.

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

## How it works (Plan A — publish-only)

```
Cursor / 요미          → draft: true posts in git (manual)
publish-slot (GHA)     → oldest draft → draft: false → GSC Indexing API (en+ko URLs)
                       → sitemap ping → draft buffer should stay at 2 (refill in Cursor)
```

Files changed are committed by GitHub Actions → Vercel redeploys on push.

Legacy full-auto mode (`write` + OpenAI) is disabled; `AUTOMATION_MODE=publish-only` in the workflow.

## Manual override

GitHub → Actions → **Blog automation** → **Run workflow** → choose task.

## Validation

Before publish, `validatePostFiles` runs a **Google content self-audit** (2,500+ chars, methodology + conclusion sections, comparison table, checklist, cover image). Thin or template-only drafts are rejected. Published posts are also checked by `npm run content:validate` on CI.
