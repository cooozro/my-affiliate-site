# Distribution engine

Post-publish signals that actually help discovery. Runs automatically from `blog-automation.yml` via `scripts/automation/distributor.mjs`.

## What runs on each publish

| Step | Channel | Purpose |
| --- | --- | --- |
| Google Indexing API | Search | Request crawl/index for EN + KO URLs |
| IndexNow | Bing, Yandex, etc. | Notify search engines of new URLs |
| Sitemap ping | Google (legacy) | Hint sitemap refresh |
| Share pack | Manual | `data/automation/share-packs/{slug}.json` — X/Reddit copy-paste text |
| Warm (after deploy) | RSS + sitemap | Fetch live feeds so aggregators see fresh items |

## Files

- `scripts/automation/distributor.mjs` — orchestrator
- `scripts/automation/indexnow.mjs` — IndexNow client
- `public/aipickindexnow2026.txt` — IndexNow key file (must stay public)
- `data/automation/distribution-log.jsonl` — audit log
- `lib/feed-excerpt.ts` + `lib/feed.ts` — RSS with `content:encoded` (Editorial Overview + Final Verdict)

## Local commands

```bash
node scripts/automation/distributor.mjs distribute --slug <slug>
node scripts/automation/distributor.mjs warm
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Recommended | GSC Indexing API |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://www.aipick.shop` |
| `INDEXNOW_KEY` | Optional | Defaults to `aipickindexnow2026` |

See `docs/BLOG_AUTOMATION.md` for the full publish pipeline.
