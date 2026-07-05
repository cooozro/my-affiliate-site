# v2 — Admin SEO audit (isolated)

Python 경로(`v2/seo_audit.py`) 대신 **Node.js**로 구현 (프로젝트 스택 일치).

| 파일 | 역할 |
| --- | --- |
| `seo-audit.mjs` | CLI 진입점 (`npm run seo-audit:update`) |
| `seo-audit/analyze.mjs` | 발행 글 read-only 분석 |
| `seo-audit/ga-report.mjs` | GA4 7일 트래픽·상위 블로그 경로 |
| `seo-audit/report-builder.mjs` | H2/H3 마크다운 리포트 |
| `seo-audit/draft-writer.mjs` | **어드민 draft만** 갱신 |
| `seo-audit/constants.mjs` | slug·제목 상수 |

**Draft slug:** `aipick-seo-precision-report`  
**스케줄:** `.github/workflows/seo-audit-daily.yml` — 08:30 KST

Guardian·replenish·publish 파이프라인과 **별도 concurrency group** — 충돌 없음.
