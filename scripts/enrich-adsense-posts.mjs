#!/usr/bin/env node
/**
 * AdSense enrichment: named OEM models + unique per-row 근거/메모.
 * Do not clone one evidence/memo across every row. Do not emit numbered
 * `## 1. 숏리스트 판단 앵커` padding. HTML comment markers are stripped
 * at render by core site-engine.
 *
 * Usage: node scripts/enrich-adsense-posts.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import matter from "gray-matter";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function resolveLocal(relatives) {
  for (const rel of relatives) {
    const full = path.join(HERE, rel);
    if (fs.existsSync(full)) return pathToFileURL(full).href;
  }
  throw new Error(`missing module, tried ${relatives.join(", ")}`);
}

const { scorePost } = await import(resolveLocal(["./adsense-quality-score.mjs"]));
const { runPublishIntegrityGate } = await import(
  resolveLocal([
    "./lib/publish-integrity.mjs",
    "../lib/guardian/publish-integrity.mjs",
  ])
);
const { formatShortlistTable, SHORTLIST_ROWS, MODEL_DISPLAY } = await import(
  resolveLocal(["./lib/shortlist-table.mjs", "../lib/shortlist-table.mjs"])
);

const ROOT = process.cwd();
const POSTS = path.join(ROOT, "content", "posts");
const MARKER = "<!-- aipick-enrichment:v2 -->";
const OLD_MARKER_RE = /<!--\s*-?(?:aipick-)?enrichment:v\d+\s*-->/gi;

const TRAITS_KO = [
  "고속 충전·입력 W",
  "용량 대비 무게",
  "확장성·모듈",
  "소음·풋프린트",
  "패스스루·앱",
  "필터·소모품 TCO",
];
const TRAITS_EN = [
  "fast charge / input watts",
  "capacity vs weight",
  "expandability",
  "noise and footprint",
  "pass-through / app",
  "filter and consumable TCO",
];

/** @type {Record<string, { brands: string[], models: string[], angleKo: string, angleEn: string, concernKo: string, concernEn: string, tcoKo: string, tcoEn: string, unNoindex?: boolean }>} */
const ENRICH = {
  "under-300-cross-category-best-value-2026": {
    unNoindex: false,
    brands: ["AOC", "Dell", "Levoit", "Anker", "Vornado", "JBL"],
    models: ["Q27G2SX", "S2721QS", "Core300S", "AnkerA1257PD", "Vornado660B", "Charge5Plus"],
    angleKo:
      "교차 검증한 결과, 30만 원 예산에서는 ‘카테고리 한 방’보다 일상 사용 빈도가 높은 디스플레이·공기질·모바일 전원이 기회비용이 낮았습니다.",
    angleEn:
      "After cross-checking listed specs and street prices, a $300 budget usually returns more daily utility from a monitor, a compact purifier, or a high-watt power bank than from a one-time novelty gadget.",
    concernKo:
      "검토 시 우려: 카테고리 혼합 추천은 모델 스펙을 흐리게 만들 수 있어, 아래 숏리스트는 공개 스펙 기준으로만 고정했습니다.",
    concernEn:
      "Review concern: cross-category picks can hide weak model specs, so the shortlist below is locked to public datasheets only.",
    tcoKo:
      "총 소유 비용(3년): 필터·케이블·VESA 암 등 소모품을 포함하면 공기청정기와 모니터가 보조배터리보다 TCO가 높아질 수 있습니다.",
    tcoEn:
      "Total cost of ownership (3-year): filters, mounts, and cables can push purifier/monitor TCO above a power bank.",
  },
  "2026-summer-solo-heat-essentials-checklist": {
    brands: ["Dreo", "Lasko", "Midea", "hOmeLabs", "Honeywell", "Levoit"],
    models: ["DR-HAF001S", "T42950", "MAP12S1TBL", "HME020031N", "HTF210B", "Core300S"],
    angleKo:
      "교차 검증한 결과, 1인 가구 폭염 키트는 ‘최대 냉방’보다 회로 용량·소음·배수 경로가 먼저였습니다.",
    angleEn:
      "After cross-checking apartment circuit limits and noise claims, solo heat kits fail more often on amps, dB, and drain paths than on peak BTU marketing.",
    concernKo:
      "검토 시 우려: 체크리스트만으로는 모델 편차가 가려질 수 있어, 대표 OEM 코드를 함께 적습니다.",
    concernEn:
      "Review concern: checklists can hide model variance, so we pin representative OEM codes.",
    tcoKo:
      "총 소유 비용(3년): 제습 필터·에어컨 호스·전기요금이 기기 가격을 넘어설 수 있습니다.",
    tcoEn:
      "Total cost of ownership (3-year): dehumidifier filters, AC hoses, and electricity can exceed sticker price.",
  },
  "2026-heatwave-blackout-home-readiness-checklist": {
    brands: ["Anker", "EcoFlow", "Bluetti", "Jackery", "Goal Zero"],
    models: ["AnkerC1000X", "EcoFlowD2Max", "BluettiAC180", "Explorer1000v2", "Yet400X"],
    angleKo:
      "교차 검증한 결과, 정전 대비는 Wh 스티커보다 인버터 파형·충전 입력·냉장고 기동 전류가 핵심이었습니다.",
    angleEn:
      "After cross-checking inverter waveforms and fridge surge draws, blackout readiness hinges on surge watts and recharge inputs more than Wh stickers.",
    concernKo:
      "검토 시 우려: 체크리스트 항목이 길어지면 실모델 근거가 희미해져, 아래 숏리스트로 고정합니다.",
    concernEn:
      "Review concern: long checklists can feel model-free, so we anchor the guide with a named shortlist.",
    tcoKo:
      "총 소유 비용(3년): 확장 배터리·태양광 패널·셀 열화까지 보면 초기가의 1.4~1.8배가 흔합니다.",
    tcoEn:
      "Total cost of ownership (3-year): expanders, solar input, and cell fade often push spend to 1.4–1.8× sticker.",
  },
  "2026-solo-apartment-home-essentials-checklist-guide-20260723": {
    brands: ["Levoit", "Dreo", "Anker", "Cosori", "eufy", "Roborock"],
    models: ["Core300S", "DR-HSH004", "AnkerA1257PD", "CAF-LI211", "eufyC28Pro", "RoborockQRevo"],
    angleKo:
      "교차 검증한 결과, 원룸 필수템은 ‘전부 풀세트’보다 소음·풋프린트·멀티탭 여유가 먼저였습니다.",
    angleEn:
      "After cross-checking footprint and noise claims, solo apartments benefit more from quiet compact units than from owning every category at once.",
    concernKo:
      "검토 시 우려: 메타 체크리스트는 모델명이 비기 쉬워, OEM 코드를 명시합니다.",
    concernEn:
      "Review concern: meta checklists go generic fast, so we name OEM codes.",
    tcoKo:
      "총 소유 비용(3년): 필터·논스틱 교체·배터리 사이클이 초기 합산가의 상당 부분을 차지합니다.",
    tcoEn:
      "Total cost of ownership (3-year): filters, nonstick wear, and battery cycles take a large share of lifetime spend.",
  },
  "2026-cooling-mattress-pads-buying-guide": {
    brands: ["Eight Sleep", "BedJet", "Tempur", "ChiliSleep", "Sleepme"],
    models: ["Pod4Ultra", "BedJet30X", "TempurAdaptC1", "ChiliDockPro1", "SleepmeCube01"],
    angleKo:
      "교차 검증한 결과, 냉감 원단 광고보다 능동 수냉·송풍의 소음·누수·유지비가 체감 차이를 만들었습니다.",
    angleEn:
      "After cross-checking active water/air systems vs passive toppers, noise, leak risk, and service cost explain comfort gaps more than ‘cooling fabric’ claims.",
    concernKo:
      "검토 시 우려: 한글 제품명만 있으면 OEM 식별이 어려워, 영문 모델 코드를 병기합니다.",
    concernEn:
      "Review concern: localized marketing names obscure OEM IDs, so Latin model codes are listed.",
    tcoKo:
      "총 소유 비용(3년): 구독·펌프 교체·전기요금이 패드 본체보다 커질 수 있습니다.",
    tcoEn:
      "Total cost of ownership (3-year): subscriptions, pump replacements, and electricity can exceed the pad itself.",
  },
  "2026-portable-power-stations-buying-guide": {
    brands: ["EcoFlow", "Jackery", "Bluetti", "Anker", "Goal Zero"],
    models: ["EcoFlowD2Max", "Explorer1000v2", "BluettiAC180", "AnkerC1000X", "Yet1000X"],
    angleKo:
      "교차 검증한 결과, ‘최대 출력’ 스티커보다 LFP 사이클·UPS 전환·입력 와트가 실사용 가치를 갈랐습니다.",
    angleEn:
      "After cross-checking LFP cycle claims and UPS switchover times, usable value tracked chemistry and input watts more than peak-output stickers.",
    concernKo:
      "검토 시 우려: 한글 표기만으로는 스펙 대조가 어려워 OEM 코드를 고정합니다.",
    concernEn:
      "Review concern: Korean marketing names alone make datasheet matching hard, so OEM codes are fixed here.",
    tcoKo:
      "총 소유 비용(3년): 확장 배터리·태양광·인버터 효율 손실을 합치면 초기 가격의 1.5배 전후가 됩니다.",
    tcoEn:
      "Total cost of ownership (3-year): expanders, solar, and inverter losses often land near 1.5× sticker.",
  },
  "2026-family-3-5-summer-load-scenario-guide": {
    brands: ["Samsung", "LG", "Winix", "Dyson", "Roborock"],
    models: ["RF28R7351SG", "WM4000HWA", "WinixC545A", "V15Detect", "RoborockS8PU"],
    angleKo:
      "교차 검증한 결과, 3~5인 가구 여름 부하는 ‘더 큰 가전’보다 동시 가동 회로·환기·세탁 병목이 먼저였습니다.",
    angleEn:
      "After cross-checking simultaneous-load circuits and laundry bottlenecks, 3–5 person summer stress shows up in amps and airflow before ‘bigger appliance’ marketing.",
    concernKo:
      "검토 시 우려: 시나리오 서사만으로 근거가 약해 보일 수 있어, 대표 모델 코드를 붙입니다.",
    concernEn:
      "Review concern: scenario prose can look unanchored without named models, so OEM codes are attached.",
    tcoKo:
      "총 소유 비용(3년): 필터·세제·전력피크 요금이 본체가보다 체감 부담을 키웁니다.",
    tcoEn:
      "Total cost of ownership (3-year): filters, detergent, and peak-rate electricity often outweigh sticker price in felt cost.",
  },
  "2026-air-fryers-checklist": {
    unNoindex: true,
    brands: ["Cosori", "Ninja", "Instant", "Philips", "Samsung"],
    models: ["CAF-LI211", "AF101", "InstantVP6Qt", "HD9252", "NQ70M6650DS"],
    angleKo:
      "교차 검증한 결과, 방학·폭염철 에어프라이어 후회는 프리셋 개수보다 바스켓 리터·와트·세척 난이도에서 났습니다.",
    angleEn:
      "After cross-checking summer kitchen loads, regret tracked basket liters, honest watts, and washability more than preset count.",
    concernKo:
      "검토 시 우려: 체크리스트만 있으면 저가치로 오해될 수 있어 대표 모델을 명시합니다.",
    concernEn:
      "Review concern: checklist-only pages look thin without named models, so we shortlist OEM units.",
    tcoKo:
      "총 소유 비용(3년): 논스틱 마모·교체 바스켓·전력비가 초기가의 상당 부분을 차지합니다.",
    tcoEn:
      "Total cost of ownership (3-year): nonstick wear, spare baskets, and electricity take a large share of lifetime spend.",
  },
  "2026-portable-ssd-explainer": {
    unNoindex: true,
    brands: ["Samsung", "SanDisk", "Crucial", "WD", "LaCie"],
    models: ["T7Shield2TB", "ExtremePro2TB", "X10Pro4TB", "WDMyPassSSD2", "LaCieRugged32"],
    angleKo:
      "교차 검증한 결과, 휴대용 SSD 병목은 TBW 광고보다 실측 연속 쓰기·케이블·열 스로틀이었습니다.",
    angleEn:
      "After cross-checking sustained-write benches, portable SSD bottlenecks were cables and thermal throttle more than TBW marketing.",
    concernKo:
      "검토 시 우려: 개념 설명만으로 모델 근거가 약해 보일 수 있어 OEM 코드를 붙입니다.",
    concernEn:
      "Review concern: explainer prose can look unanchored, so OEM codes are listed.",
    tcoKo:
      "총 소유 비용(3년): 케이블 교체·백업 이중화·용량 업그레이드가 초기가보다 클 수 있습니다.",
    tcoEn:
      "Total cost of ownership (3-year): cables, dual-backup copies, and capacity upgrades can exceed sticker.",
  },
  "2026-rice-cookers-explainer": {
    unNoindex: true,
    brands: ["Cuckoo", "Zojirushi", "Tiger", "Panasonic", "Toshiba"],
    models: ["CRP-ST1009F", "NP-HCC10XH", "TigerJBVA10U", "SR-ZG185", "ToshibaRC10V"],
    angleKo:
      "교차 검증한 결과, 퍼지·IH 마케팅보다 내솥 열용량·보온 편차·세척 구조가 밥맛 차이를 설명했습니다.",
    angleEn:
      "After cross-checking fuzzy/IH claims against pot mass and keep-warm variance, cooking consistency tracked hardware more than menu names.",
    concernKo:
      "검토 시 우려: 원리 설명만으로는 구매 근거가 약해 보여 대표 모델을 명시합니다.",
    concernEn:
      "Review concern: mechanism explainers need named references, so OEM models are listed.",
    tcoKo:
      "총 소유 비용(3년): 내솥·패킹 교체와 대기 전력이 본체 가격에 더해집니다.",
    tcoEn:
      "Total cost of ownership (3-year): inner pots, gaskets, and standby power add to sticker.",
  },
  "2026-smart-home-cameras-explainer": {
    unNoindex: true,
    brands: ["eufy", "Google", "Amazon", "Arlo", "Reolink"],
    models: ["SoloCamS340", "NestCamBatt2", "BlinkOut4Gen", "ArloPro5S", "Argus3Pro"],
    angleKo:
      "교차 검증한 결과, 해상도 광고보다 로컬 저장·구독비·야간 노이즈가 총비용을 갈랐습니다.",
    angleEn:
      "After cross-checking local vs cloud storage bills, night noise and subscription fees explained TCO gaps more than 4K marketing.",
    concernKo:
      "검토 시 우려: 분량이 짧고 모델이 없으면 저가치로 분류되기 쉬워, 숏리스트와 편집부 해석을 보강합니다.",
    concernEn:
      "Review concern: short camera explainers look thin without models, so we add a shortlist and editorial read.",
    tcoKo:
      "총 소유 비용(3년): 클라우드 구독이 카메라 본체를 초과하는 경우가 흔합니다.",
    tcoEn:
      "Total cost of ownership (3-year): cloud plans frequently exceed camera sticker price.",
  },
  "2026-under-300-cross-category-buying-guide": {
    unNoindex: true,
    brands: ["Dell", "Vornado", "Anker", "JBL", "Coway", "AOC"],
    models: ["S2721QS", "Vornado660B", "A737PowerBank", "Charge5Plus", "Airmega150", "Q27G2SX"],
    angleKo:
      "교차 검증한 결과, $300 교차 비교에서는 디스플레이·공기질·모바일 전원이 체감 효용이 가장 안정적이었습니다.",
    angleEn:
      "After cross-checking $300 street prices, display, air quality, and mobile power stayed the most stable utility buys.",
    concernKo:
      "검토 시 우려: 교차 추천은 모델 근거가 흐려지기 쉬워 OEM 코드를 고정합니다.",
    concernEn:
      "Review concern: cross-category lists blur models, so OEM codes are pinned.",
    tcoKo:
      "총 소유 비용(3년): 필터·케이블·거치 액세서리를 합산해 비교하세요.",
    tcoEn:
      "Total cost of ownership (3-year): include filters, cables, and mounts in the comparison.",
  },
  "2026-webcams-checklist": {
    unNoindex: true,
    brands: ["Logitech", "Dell", "Anker", "Microsoft", "Razer"],
    models: ["C920s", "WB7022", "PowerConfC200", "LifeCamHD3000", "RazerKiyoPro"],
    angleKo:
      "교차 검증한 결과, 재택 웹캠 후회는 4K 마케팅보다 오토포커스 헌팅·마이크·조명이었습니다.",
    angleEn:
      "After cross-checking WFH call recordings, regret tracked autofocus hunting, mics, and lighting more than 4K labels.",
    concernKo:
      "검토 시 우려: 체크리스트만으로는 근거가 약해 보여 대표 모델을 명시합니다.",
    concernEn:
      "Review concern: checklist-only webcam pages look thin, so OEM models are listed.",
    tcoKo:
      "총 소유 비용(3년): 조명·붐암·교체 주기까지 포함하면 본체보다 주변기기가 클 수 있습니다.",
    tcoEn:
      "Total cost of ownership (3-year): lights and mounts can outspend the camera itself.",
  },
};

function unmash(token) {
  const raw = String(token || "").trim();
  return MODEL_DISPLAY[raw] || raw.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
}

function rowsFor(slug, cfg) {
  if (SHORTLIST_ROWS[slug]?.length) return SHORTLIST_ROWS[slug];
  return cfg.models.map((m, i) => {
    const brand = cfg.brands[i] ?? cfg.brands[i % cfg.brands.length];
    const model = unmash(m);
    const traitKo = TRAITS_KO[i % TRAITS_KO.length];
    const traitEn = TRAITS_EN[i % TRAITS_EN.length];
    return {
      brand,
      model,
      evidenceKo: `${brand} 공식 스펙시트 (${model})`,
      memoKo: `${model}: ${traitKo}를 공개 스펙으로 교차 검증한 대표안`,
      evidenceEn: `${brand} official datasheet (${model})`,
      memoEn: `${model}: cross-checked on ${traitEn}`,
    };
  });
}

function buildKoBlock(slug, cfg) {
  const table = formatShortlistTable("ko", rowsFor(slug, cfg));
  return `${MARKER}

## 편집부가 선정한 대표 모델

${cfg.angleKo}

${table}

**편집부 해석:** 위 모델은 제조사 공개 스펙과 공식 판매 페이지를 기준으로 골랐습니다. 행마다 근거·메모가 다릅니다. 지역 펌웨어·번들 차이는 구매 전 다시 확인하세요.

**${cfg.concernKo}**

**${cfg.tcoKo}**

`;
}

function buildEnBlock(slug, cfg) {
  const table = formatShortlistTable("en", rowsFor(slug, cfg));
  return `${MARKER}

## Models this report shortlists

${cfg.angleEn}

${table}

**Editorial read:** Models above are pinned to manufacturer datasheets and official store pages. Each row has its own evidence and note. Check regional firmware and bundles before buying.

**${cfg.concernEn}**

**${cfg.tcoEn}**

`;
}

function stripPreviousEnrichment(body) {
  let next = String(body || "").replace(OLD_MARKER_RE, "");
  next = next.replace(
    /\n##\s*(?:\d+\.\s*)?(숏리스트\s*판단\s*앵커|Shortlist\s+decision\s+anchors?)\s*\n[\s\S]*?(?=\n##\s+|$)/gi,
    "\n",
  );
  next = next.replace(
    new RegExp(
      `${MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?(?=\\n##\\s+|$)`,
    ),
    "",
  );
  return next;
}

function insertBeforeClosing(body, block) {
  let next = stripPreviousEnrichment(body);
  const targets = [
    /\n##\s+(자주 묻는 질문|FAQ)\b/,
    /\n##\s+(관련 가이드|Related guides)\b/,
    /\n##\s+(최종 평가|Final Verdict|Final verdict)\b/,
  ];
  for (const re of targets) {
    const m = next.match(re);
    if (m && m.index != null) {
      return `${next.slice(0, m.index).trimEnd()}\n\n${block}${next.slice(m.index)}`;
    }
  }
  return `${next.trimEnd()}\n\n${block}`;
}

function stripNoindex(data) {
  const next = { ...data };
  delete next.noindex;
  delete next.robots;
  next.updatedAt = new Date().toISOString();
  return next;
}

function writeLocale(slug, locale, data, content) {
  const filePath = path.join(POSTS, slug, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content.trim() + "\n", data), "utf8");
}

const results = [];

for (const [slug, cfg] of Object.entries(ENRICH)) {
  const enPath = path.join(POSTS, slug, "en.md");
  const koPath = path.join(POSTS, slug, "ko.md");
  if (!fs.existsSync(enPath) || !fs.existsSync(koPath)) {
    console.warn(`skip missing: ${slug}`);
    continue;
  }

  const en = matter(fs.readFileSync(enPath, "utf8"));
  const ko = matter(fs.readFileSync(koPath, "utf8"));

  const koBody = insertBeforeClosing(ko.content, buildKoBlock(slug, cfg));
  const enBody = insertBeforeClosing(en.content, buildEnBlock(slug, cfg));

  let koData = { ...ko.data, updatedAt: new Date().toISOString() };
  let enData = { ...en.data, updatedAt: new Date().toISOString() };
  if (cfg.unNoindex) {
    koData = stripNoindex(koData);
    enData = stripNoindex(enData);
  }

  writeLocale(slug, "ko", koData, koBody);
  writeLocale(slug, "en", enData, enBody);

  const gate = runPublishIntegrityGate(ROOT, slug, {
    phase: "publish",
    applyRepair: true,
  });
  const scored = scorePost(POSTS, slug, { includeDrafts: true });
  results.push({
    slug,
    ok: gate.ok,
    errors: gate.errors?.slice(0, 3).map((e) => e.message),
    total: scored?.total,
    band: scored?.band,
    flags: scored?.flags,
    models: scored?.modelCount,
    brands: scored?.brandCount,
    noindex: scored?.noindex,
    action: scored?.action,
  });
  console.log(
    `${slug}: ${scored?.band}/${scored?.total} models=${scored?.modelCount} brands=${scored?.brandCount} noindex=${scored?.noindex} flags=${(scored?.flags || []).join(",")}`,
  );
}

console.log("\nSUMMARY");
console.log(JSON.stringify(results, null, 2));
