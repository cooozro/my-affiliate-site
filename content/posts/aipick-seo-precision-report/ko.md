---
title: '[aipick SEO 정밀 분석: 최상단 노출 리포트]'
description: '어드민 전용 SEO 자율 분석 리포트 — SERP 구조, JSON-LD, 저품질 방어, GA4 7일 유입.'
date: '2026-07-10'
draft: true
contentProfile: editorial
tags:
  - SEO
  - internal
  - admin-audit
robots: 'noindex, nofollow'
updatedAt: '2026-07-10T13:22:37.047Z'
---
## 편집부 개요

> **어드민 전용 draft** — Google sitemap·RSS 미포함, 공개 블로그 URL 비활성. SEO 개선 지표 전용 리포트입니다.

- **생성 시각 (KST):** 2026년 7월 10일 금요일 오후 10:22
- **스캔 대상:** 발행 글 31 slug / 62 locale 파일
- **분석 제외:** `welcome` (인사말·내부 전용)

## 대시보드 요약

> 마지막 갱신 기준 **3대 핵심 축** — 운영 로직 · 수익성/효율 · 시스템 건강도

| 축 | 점수 | 상태 |
| --- | --- | --- |
| 운영 로직 상태 | **91%** | ✅ 좋음 |
| 수익성·효율성 지표 | **98%** | ✅ 좋음 |
| 시스템 건강도 | **100%** | ✅ 좋음 |

### 운영 로직 상태

✅ **91%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ _(좋음)_

- SERP 구조·검색 의도 일치 **91%**
- 스캔 대상 **31** slug (welcome 등 1건 제외)
- locale 파일 **62**개 분석

### 수익성·효율성 지표

✅ **98%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 _(좋음)_

- JSON-LD 준비도 **96%**
- 구조화 데이터 적용 가능 EN 글 **100%**
- 스키마(FAQ·HowTo) 전제 조건 충족률 기준

### 시스템 건강도

✅ **100%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 _(좋음)_

- 저품질 방어(Guardian) **100%**
- 정책·무결성 게이트 publish phase 스캔
- ✅ 고위험 slug 없음

---

## Executive Summary

| 지표 | 점수 | 상태 | 설명 |
| --- | --- | --- | --- |
| SERP 구조·검색 의도 일치 | **91%** | ✅ 좋음 | H2 구성, 프로필별 필수 섹션(FAQ·방법론 등) |
| ↳ 시각화 | | ✅ **91%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ _(좋음)_ | |
| JSON-LD 준비도 | **96%** | ✅ 좋음 | Article/FAQ/HowTo 스키마 전제 조건 |
| ↳ 시각화 | | ✅ **96%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜ _(좋음)_ | |
| 저품질 방어 | **100%** | ✅ 좋음 | Guardian 정책·무결성 게이트 기준 |
| ↳ 시각화 | | ✅ **100%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 _(좋음)_ | |
| 구조화 데이터 적용 가능 비율 | **100%** | ✅ 좋음 | JSON-LD 이슈 0건 EN 포스트 비율 |
| ↳ 시각화 | | ✅ **100%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 _(좋음)_ | |

## GA4 — 최근 7일 유입 (연관성 참고)

### GA4 연결 가이드

> ⚠️ **현재 GA4 미연결** — 아래 위치에 Secret/환경변수를 등록하면 자동 집계됩니다.

| 용도 | 설정 위치 | 변수명 |
| --- | --- | --- |
| **매일 SEO 리포트** (08:30 KST) | GitHub → repo → **Settings → Secrets → Actions** | `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` |
| **어드민 대시보드** GA 위젯 | Vercel → Project → **Settings → Environment Variables** | 동일 |
| **로컬 테스트** (`npm run seo-audit:update`) | 프로젝트 루트 **`.env`** (git 제외) | 동일 |

**값 입력 방법**

0. **GCP → API 및 서비스 → 라이브러리** → `Google Analytics Data API` **사용 설정** (403 오류 시 필수)
1. `GA4_PROPERTY_ID` — GA4 관리 → 속성 설정 → **속성 ID** (숫자만, 예: `123456789`)
2. `GOOGLE_SERVICE_ACCOUNT_JSON` — GCP 서비스 계정 JSON **전체**를 한 줄로 붙여넣기
3. GA4 → 속성 액세스 관리 → 서비스 계정 이메일에 **뷰어(Viewer)** 권한 부여

**API 활성화 링크:** [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com) (서비스 계정이 속한 GCP 프로젝트에서 Enable)
**로컬 `.env` 예시**

```
GA4_PROPERTY_ID=123456789
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

_이미 `blog-automation` 등에 `GOOGLE_SERVICE_ACCOUNT_JSON`이 있다면 SEO audit도 동일 Secret을 재사용합니다. `GA4_PROPERTY_ID`만 추가하면 됩니다._

## SERP 벤치마킹 — 구조·의도 점수

✅ **91%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ _(좋음)_

발행 EN 글의 H2 구조와 `contentProfile` 템플릿 요구(FAQ, 방법론, 체크리스트 등) 일치도를 0–100%로 산출합니다. `welcome` 등 인사말 페이지는 제외됩니다.

### 상위 5 (구조 점수)

| Slug | Profile | H2 | 점수 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-air-fryers-checklist | checklist | 8 | 95% | ✅ |
| 2026-bidets-checklist | checklist | 8 | 95% | ✅ |
| 2026-summer-ac-buying-checklist | checklist | 10 | 95% | ✅ |
| 2026-webcams-checklist | checklist | 8 | 95% | ✅ |
| 2026-action-cameras-buying-guide | buying-guide | 14 | 90% | ✅ |

## 데이터 무결성 — JSON-LD

✅ **96%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜ _(좋음)_

평균 준비도 **96%**, 이슈 없는 EN 글 **100%**.

### 점검 항목

- ✅ title / description(50–160자) / date
- ✅ FAQ 섹션 + H3 3쌍 이상 (FAQPage)
- ✅ coverImage 실파일 존재
- ✅ checklist 프로필 → HowTo step 후보(번호 목록)

## 저품질 방어 스캔

✅ **100%** 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 _(좋음)_

Guardian `content-policy` + `publish-integrity` (publish phase, repair 없음)로 위험 문구·게이트 실패를 탐지합니다.

### 주의 목록 (구조 < 60 또는 정책 이슈)

✅ _현재 게이트 기준 고위험 slug 없음._

## 키워드 밀도 샘플 (EN 상위 글)

### 2026-air-fryers-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| or | 24 | ✅ 1.8% |
| air | 16 | ✅ 1.2% |
| basket | 12 | ✅ 0.9% |
| oven | 12 | ✅ 0.9% |
| to | 12 | ✅ 0.9% |

### 2026-bidets-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| in | 28 | ✅ 1.6% |
| or | 23 | ✅ 1.3% |
| seat | 21 | ✅ 1.2% |
| pressure | 20 | ✅ 1.1% |
| summer | 18 | ✅ 1% |

### 2026-summer-ac-buying-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| window | 13 | ✅ 1.2% |
| in | 12 | ✅ 1.1% |
| btu | 11 | ✅ 1.1% |
| or | 11 | ✅ 1.1% |
| install | 9 | ✅ 0.9% |

## 운영 메모

- 이 글은 **draft:true** 고정 — 자동 발행·replenish 대상 아님
- 매일 **08:30 KST** `seo-audit-daily` 워크플로우 갱신
- 라이브 포스트 본문은 **읽기 전용** — 이 모듈은 수정하지 않음
- `welcome` slug는 인사말 전용 — SEO 구조 점수 산출에서 **제외**
