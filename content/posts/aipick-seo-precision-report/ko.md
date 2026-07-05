---
title: '[aipick SEO 정밀 분석: 최상단 노출 리포트]'
description: '어드민 전용 SEO 자율 분석 리포트 — SERP 구조, JSON-LD, 저품질 방어, GA4 7일 유입.'
date: '2026-07-06'
draft: false
contentProfile: editorial
tags:
  - SEO
  - internal
  - admin-audit
robots: 'noindex, nofollow'
updatedAt: '2026-07-05T23:53:20.308Z'
publishedAt: '2026-07-05T23:53:20.308Z'
---
## 편집부 개요

> **어드민 전용 draft** — Google sitemap·RSS 미포함, 공개 블로그 URL 비활성. SEO 개선 지표 전용 리포트입니다.

- **생성 시각 (KST):** 2026년 7월 5일 일요일 오후 12:25
- **스캔 대상:** 발행 글 18 slug / 36 locale 파일

## Executive Summary

| 지표 | 점수 | 설명 |
| --- | --- | --- |
| SERP 구조·검색 의도 일치 | 74% | H2 구성, 프로필별 필수 섹션(FAQ·방법론 등) |
| JSON-LD 준비도 | 94% | Article/FAQ/HowTo 스키마 전제 조건 |
| 저품질 방어 | 100% | Guardian 정책·무결성 게이트 기준 |
| 구조화 데이터 적용 가능 비율 | 94% | JSON-LD 이슈 0건 EN 포스트 비율 |

## GA4 — 최근 7일 유입 (연관성 참고)

_GA4 미연결 — `GA4_PROPERTY_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` 설정 시 자동 집계._

## SERP 벤치마킹 — 구조·의도 점수

발행 EN 글의 H2 구조와 `contentProfile` 템플릿 요구(FAQ, 방법론, 체크리스트 등) 일치도를 0–100%로 산출합니다.

### 상위 5 (구조 점수)

| Slug | Profile | H2 | 점수 |
| --- | --- | --- | --- |
| 2026-air-fryers-checklist | checklist | 8 | 85% |
| 2026-summer-ac-buying-checklist | checklist | 10 | 85% |
| 2026-webcams-checklist | checklist | 8 | 85% |
| 2026-gaming-consoles-scenario-guide | scenario-guide | 11 | 80% |
| 2026-noise-cancelling-headphones-head-to-head | head-to-head | 11 | 80% |

## 데이터 무결성 — JSON-LD

평균 준비도 **94%**, 이슈 없는 EN 글 **94%**.

### 점검 항목

- title / description(50–160자) / date
- FAQ 섹션 + H3 3쌍 이상 (FAQPage)
- coverImage 실파일 존재
- checklist 프로필 → HowTo step 후보(번호 목록)

## 저품질 방어 스캔

Guardian `content-policy` + `publish-integrity` (publish phase, repair 없음)로 위험 문구·게이트 실패를 탐지합니다.

### 주의 목록 (구조 < 60 또는 정책 이슈)

#### welcome (ko)

- 구조: 45% | JSON-LD: 70% | 방어: 100%
- JSON-LD: FAQ section missing (FAQPage schema)

#### welcome (en)

- 구조: 55% | JSON-LD: 70% | 방어: 100%
- JSON-LD: FAQ section missing (FAQPage schema)

## 키워드 밀도 샘플 (EN 상위 글)

### 2026-air-fryers-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| or | 24 | 1.8% |
| air | 16 | 1.2% |
| basket | 12 | 0.9% |
| oven | 12 | 0.9% |
| to | 12 | 0.9% |

### 2026-summer-ac-buying-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| window | 13 | 1.2% |
| in | 12 | 1.1% |
| btu | 11 | 1.1% |
| or | 11 | 1.1% |
| install | 9 | 0.9% |

### 2026-webcams-checklist

| 토큰 | 빈도 | 밀도 |
| --- | --- | --- |
| on | 18 | 1.4% |
| or | 18 | 1.4% |
| to | 14 | 1.1% |
| mic | 13 | 1% |
| in | 12 | 0.9% |

## 운영 메모

- 이 글은 **draft:true** 고정 — 자동 발행·replenish 대상 아님
- 매일 **08:30 KST** `seo-audit-daily` 워크플로우 갱신
- 라이브 포스트 본문은 **읽기 전용** — 이 모듈은 수정하지 않음
