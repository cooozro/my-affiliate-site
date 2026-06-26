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

- **작성:** Cursor(요미)가 `draft: true` 임시글 작성 — **OpenAI API 미사용**
- **보충:** 발행 직후 buffer < 2이면 `data/automation/cursor-draft-request.json` 생성 → Cursor가 작성 후 `status: complete`
- **발행:** 하루 최대 2건, **4–6시간 랜덤 간격** (GitHub Actions)
- **임시 보관(draft):** 항상 **2건** 유지
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

`OPENAI_API_KEY` is **not** used in Plan A (Cursor writes drafts).

### 2. GitHub Variables (optional)

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://www.aipick.shop` |

### 3. Google Search Console Indexing API

1. [Google Cloud Console](https://console.cloud.google.com/) → create project
2. Enable **Web Search Indexing API**
3. Create **Service Account** → download JSON key
4. Search Console → Settings → Users → add service account email as **Owner**
5. Paste full JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` secret

Without GSC credentials, posts still publish; indexing is skipped with a warning.

### 4. Initial draft buffer

Before the first publish cron, seed 2 drafts in **Cursor** (`draft: true`, en+ko per post).

## Local commands

```bash
npm run automation:status   # queue & daily counters + cursor-draft-request
npm run automation:publish  # publish oldest draft (local test)
```

## How it works (Plan A — publish-only)

```
Cursor / 요미          → draft: true posts in git
publish-slot (GHA)     → oldest draft → draft: false → GSC Indexing API (en+ko URLs)
                       → sitemap ping → cursor-draft-request.json if buffer < 2
Cursor (git push)      → reads request file → writes 1 draft → status: complete → push
```

### Cursor draft replenish

After each publish, if fewer than 2 drafts remain, GitHub Actions writes
`data/automation/cursor-draft-request.json` with `status: "pending"` and a suggested topic.

**Cursor agent (요미) should:**

1. Check `cursor-draft-request.json` when working on this repo
2. If `status === "pending"`, write one buying-guide draft (en+ko) per `docs/CONTENT_STANDARDS.md`
3. Run `npm run content:validate`
4. Set request `status` to `"complete"` and push

Optional: set up a **Cursor Automation** on `git push` to `main` when commit message contains
`chore(automation): publish-slot` to run the replenish step without opening the IDE manually.

## Manual override

GitHub → Actions → **Blog automation** → **Run workflow** → choose task.

## Validation

Before publish, `validatePostFiles` runs a **Google content self-audit** (2,500+ chars, methodology + conclusion sections, comparison table, checklist, cover image). Thin or template-only drafts are rejected. Published posts are also checked by `npm run content:validate` on CI.
