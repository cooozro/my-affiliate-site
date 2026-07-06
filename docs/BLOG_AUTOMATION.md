# Blog automation

Automated draft writing, publishing, and Google Search Console indexing for AI Pick & Report.

## 24/7 cloud (PC off)

| Step | Where | Schedule |
| --- | --- | --- |
| Publish check | GitHub Actions `blog-automation.yml` | Every 15 min + hourly backup + on `main` push |
| Publish draft | Same workflow | Random 4–6h gap, max 2/day KST |
| Draft replenish | Same workflow + `cursor-draft-replenish.yml` backup | Right after publish; backup every 15 min if pending |
| Indexing | Google Indexing API | On each publish |

All steps run on GitHub/Cursor cloud — **no PC, no VPS**.

### Required secret for draft replenish

| Secret | Purpose |
| --- | --- |
| `CURSOR_API_KEY` | Cursor agent on GHA writes drafts ([Dashboard → Integrations](https://cursor.com/dashboard/integrations)) |

Without `CURSOR_API_KEY`, publish still works but draft replenish fails until the key is added.

## Schedule (Korea Standard Time) — Plan A (Cursor writes, automation publishes)

| Rule | Value |
| --- | --- |
| Cron check | Every **15 minutes** + **hourly backup** (KST 08:00–23:00) + **every `main` push** |
| Publish times | **Random** — not fixed 11:00 / 17:00 |
| Gap between publishes | **4–6 hours** (random per slot) |
| First slot of KST day | **06:00 KST** anchor + **4–6h** random (typically 10:00–12:00) |
| After daily cap (2/day) | Next slot rolls to **following KST day** (not same evening) |
| Daily cap | Max **2** publishes per KST day |

`data/automation/state.json` stores `nextPublishAt` (UTC ISO). Admin shows the next slot in KST.

**GitHub cron reliability:** Scheduled workflows can be delayed or skipped on low-traffic repos. This project uses (1) hourly backup crons, (2) a `main` push trigger, and (3) catch-up logic when a slot is overdue by 15+ minutes.

**Writing** is done in **Cursor** (`draft: true`). GitHub Actions only publishes and requests Google indexing.

## Rules

- **작성:** Cursor(요미)가 `draft: true` 임시글 작성 — **OpenAI API 미사용**
- **보충:** 발행 직후 buffer < 2 → GitHub Actions가 **Cursor SDK**로 임시글 1건 작성 (PC 불필요)
- **발행:** 하루 최대 2건, **4–6시간 랜덤 간격** (GitHub Actions)
- **임시 보관(draft):** 항상 **2건** 유지
- **콘텐츠 기준:** `docs/CONTENT_STANDARDS.md` (구글 가이드 · 애드센스 · SEO)

## Topics / categories

Rotating pool in `scripts/automation/topics.mjs` (season-first via `scripts/lib/season-topics.mjs`).

**Topic diversity:** `scripts/lib/topic-diversity.mjs` blocks a 3rd consecutive draft/pick with the same topic id, category, or `topicCluster` (e.g. `air-conditioning` for portable/window AC). Max **2 in a row**; history tracked in `state.json` → `topicHistory`. During **tier1-first-pass**, `taxonomyGroup` spread defers a product aisle that already has a post when another aisle still has zero coverage (e.g. robot vacuum published → stick vacuum deferred until `coffee-machines` etc. are written).

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
| `PEXELS_API_KEY` | Yes (cover images) | Pexels stock photos |
| `PIXABAY_API_KEY` | Yes (cover images) | Pixabay stock photos — rotates with Pexels by slug |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Recommended | Indexing API URL submit |
| `CURSOR_API_KEY` | **Yes** (draft replenish on GHA) | Cursor agent writes drafts when PC is off |

`OPENAI_API_KEY` is **not** used in Plan A.

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
publish-slot (GHA)     → publish oldest draft
                       → distributor.mjs (GSC + IndexNow + share pack)
                       → cursor-draft-request.json if buffer < 2
                       → commit + push → Vercel redeploy
                       → warm RSS/sitemap (120s after push)
backup (GHA)           → cursor-draft-replenish.yml every 15 min if still pending
```

**Distribution details:** `docs/DISTRIBUTION.md`

### Cursor draft replenish (automated)

After publish, `run-cursor-replenish.mjs` runs **inside GitHub Actions** using `@cursor/sdk` (local runtime on the Ubuntu runner). It reads `cursor-draft-request.json`, writes en+ko draft, fetches cover via Pexels, validates, and commits.

Manual Cursor IDE is optional — only for editing or overrides.

## Manual override

GitHub → Actions → **Blog automation** → **Run workflow** → choose task.

## Validation

Before publish, `validatePostFiles` runs a **Google content self-audit** (2,500+ chars, methodology + conclusion sections, comparison table, checklist, cover image). Thin or template-only drafts are rejected. Published posts are also checked by `npm run content:validate` on CI.
