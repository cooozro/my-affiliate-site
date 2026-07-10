# Pipeline Guardian Changelog

All changes under `scripts/lib/guardian/` require owner approval before commit.

Record **impact on other modules** when proposing a change.

## 2026-07-06 — Topic inference fix (laptop duplicate draft)

**Root cause:** Published `2026-laptops-buying-guide` lacked `topicId`, so coverage treated slug as topic id — `laptops` looked uncovered and a second draft was allowed.

**Fixed:** `infer-post-topic.mjs` slug segment matching + laptop/usb-c/webcam rules; `topicId: laptops` on buying guide; draft gate calls `validateReplenishTopicUnique`; removed duplicate `2026-laptops-head-to-head` draft.

**Impact:** `topic-coverage`, `pickTopic`, replenish validation, publish-integrity. No API breaks.

## 2026-07-06 — Korean Hanja forbidden + typo repair

**Added:** `CJK_HANJA_RE`, `HANJA_AUTO_FIXES` in `content-policy.mjs` — Korean posts must use Hangul only; known Hanja auto-repaired on publish/draft save; `독찴적` → `독창적` typo fix.

**Impact:** `content-quality.mjs` (validate-post Hanja gate), `automation/prompts.mjs`, `publish-integrity.mjs` (existing `repairContentPolicyText` path). No breaking API changes.

## 2026-07-03 — Phase 1: Pipeline Guardian

**Approved:** 1-B, 2-B, 3-C, 5-C, 6-A (deferred render), 11-B

**Moved into guardian:**

| Module | Role |
| --- | --- |
| `editorial-standards.mjs` | Methodology blocks, misleading-source patterns, title rules |
| `content-policy.mjs` | Google/AdSense forbidden phrases, typo repair |
| `automation-guard.mjs` | No overwrite published slugs, replenish validation |
| `publish-integrity.mjs` | Draft/publish integrity gate + auto-repair |

**Backward compatibility:** `scripts/lib/*.mjs` shims re-export from `guardian/`.

**Impact:**

- `content-quality.mjs` — imports editorial-standards + content-policy via guardian paths
- `posts-fs.mjs`, `check-integrity.mjs`, `daily-content-audit-runner.mjs` — unchanged import paths (shims)
- `run-cursor-replenish.mjs` — unchanged import paths (shims)
- `lib/admin-actions.ts` — unchanged dynamic import path (shim)

**Not yet in guardian (Phase 2 render):**

- Blog post metadata builder (`lib/guardian/meta.ts`)
- JSON-LD public API wrap
- Article chrome (share bar, publication tagline placement)

## 2026-07-04 — SEO hybrid content strategy (pipeline)

**Added:**

| Module | Role |
| --- | --- |
| `content-strategy.mjs` | A/B writing mode (stable vs benchmark), 50:50 sliding window, tone rotation, strategy log |
| `serp-providers.mjs` | Pluggable SERP backends (default: Serper.dev) |
| `serp-benchmark.mjs` | Serper-backed search, SERP cache, outline synthesis, originality gates |

**Impact:**

- `cursor-draft-request.mjs` — async queue with `prepareDraftStrategy`, benchmark outline in request JSON
- `run-cursor-replenish.mjs` — benchmark outline in Cursor prompt; records strategy on success
- `publish-draft.mjs` — awaits async replenish queue
- `prompts.mjs` / `generate-draft.mjs` — OpenAI fallback supports benchmark outline
- GHA workflows — `SERPER_API_KEY` secret (replaces Google Custom Search keys)
- `data/automation/serp-cache/`, `content-strategy-log.json` — runtime artifacts

**Env:** `.env` — `SERPER_API_KEY`, optional `SERP_PROVIDER=serper`

## 2026-07-04 — Serper.dev migration (SERP provider)

**Changed:** `serp-benchmark.mjs` now uses `serp-providers.mjs` (default `serper`) instead of Google Custom Search JSON API (closed to new GCP projects).

**Env:** `SERPER_API_KEY` replaces `AIPICK_SEARCH_API_KEY` + `GOOGLE_CX`.

## 2026-07-10 — GFM tilde repair (dollar approx + ranges)

**Changed:** `markdown-gfm-tilde.mjs` — also fixes `~$100` / `$90~$120` pairs that caused accidental `<del>` strikethrough; shields `~{{` liveData placeholders; locale-aware `about` / `약` prefix.

**Impact:** `repairPostLocale` + `scan-gfm-tilde.mjs --repair`; publish draft enforces `MIN_PUBLISH_GAP_HOURS` between same-day posts.

## 2026-07-05 — GFM tilde range repair

**Added:** `markdown-gfm-safe.mjs` — auto-replace `4~6` style ranges with en-dash in `repairPostLocale` to prevent accidental GFM strikethrough (`<del>`).

## 2026-07-04 — SERP editorial filter + keyword suffix

**Added:** `serp-filters.mjs` — shopping-mall domain exclusion, blog/editorial priority, B-type keyword suffix (`후기`, `장단점`, etc.).

**Impact:** `serp-benchmark.mjs` filters Coupang/Himart/etc.; cache stores `filterStats` + `domains`.
