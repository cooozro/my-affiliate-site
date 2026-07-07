# Distribution engine

Post-publish **direct URL submission** (Google Indexing API + IndexNow for Bing/Naver/global).  
Runs automatically on every `main` push that touches `content/posts/**` — including **admin manual publish**.

Sitemap and RSS remain registered in Search Console / Naver; this layer asks crawlers to **fetch new URLs faster**.

## What runs on each publish

| Step | Channel | Purpose |
| --- | --- | --- |
| Google Indexing API | `google-indexing` | URL_UPDATED for EN + KO blog URLs |
| IndexNow (global) | `indexnow-global` | `api.indexnow.org` |
| IndexNow (Naver) | `indexnow-naver` | `searchadvisor.naver.com/indexnow` |
| IndexNow (Bing) | `indexnow-bing` | `bing.com/indexnow` |
| Warm (90s after push) | sitemap + RSS | Refetch feeds for aggregators |
| Share pack | Manual | `data/automation/share-packs/{slug}.json` |

## Modules

| File | Role |
| --- | --- |
| `scripts/lib/index-submission.mjs` | Core: `submitPublishedPost()`, `warmFeedAndSitemap()` |
| `scripts/automation/indexnow.mjs` | Multi-endpoint IndexNow (global + Naver + Bing) |
| `scripts/automation/google-indexing.mjs` | Google Indexing API |
| `scripts/automation/distributor.mjs` | Orchestrator, logging, share packs, git push hook |
| `.github/workflows/url-index-submission.yml` | Auto-run on content push + manual backfill |
| `public/aipickindexnow2026.txt` | IndexNow key verification file |

## Triggers

1. **GHA publish-slot** — `publish-draft.mjs` → `distributePublishedPost()` inline  
2. **Push to `content/posts/**`** — `url-index-submission.yml` → `distributor.mjs on-push` (catches admin publish)  
3. **Manual** — see commands below

## Local commands

```bash
# Single slug (after publish)
npm run automation:distribute -- --slug 2026-example-post

# Simulate post-push (git diff HEAD~1)
npm run automation:index-on-push

# One-time: posts never in distribution-log.jsonl (e.g. early 5 posts)
npm run automation:index-backfill

# Warm sitemap/RSS
node scripts/automation/distributor.mjs warm
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Recommended | GSC Indexing API (GitHub secret) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://www.aipick.shop` |
| `INDEXNOW_KEY` | Optional | Defaults to `aipickindexnow2026` |

## Notes

- IndexNow does **not** guarantee indexing — only notifies crawlers (same as manual “수집 요청”, but automated).  
- Naver: IndexNow complements sitemap/RSS; official FAQ says all can be used together.  
- Deprecated Google sitemap ping (`google.com/ping`) removed — returns 404; Indexing API + sitemap in GSC is enough.
