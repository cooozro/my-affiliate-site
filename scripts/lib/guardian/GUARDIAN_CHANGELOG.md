# Pipeline Guardian Changelog

All changes under `scripts/lib/guardian/` require owner approval before commit.

Record **impact on other modules** when proposing a change.

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
