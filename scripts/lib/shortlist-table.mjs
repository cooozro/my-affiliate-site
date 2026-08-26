/**
 * AIPICK variant: unique shortlist 근거/메모 per model.
 * Core site-engine only drops cloned columns — it does not invent copy.
 */

import {
  sanitizePipelineArtifacts,
  hasPipelineHtmlComment,
  hasOrphanShortlistAnchor,
} from "./site-engine/index.mjs";

export const MODEL_DISPLAY = {
  AnkerC1000X: "C1000X",
  EcoFlowD2Max: "DELTA 2 Max",
  BluettiAC180: "AC180",
  Explorer1000v2: "Explorer 1000 v2",
  Yet400X: "Yeti 400X",
  Yet1000X: "Yeti 1000X",
  AnkerA1257PD: "A1257 PD",
  Vornado660B: "660",
  Charge5Plus: "Charge 5",
  Core300S: "Core 300S",
  Q27G2SX: "Q27G2SX",
  S2721QS: "S2721QS",
  T7Shield2TB: "T7 Shield 2TB",
  ExtremePro2TB: "Extreme Pro 2TB",
  X10Pro4TB: "X10 Pro 4TB",
  WDMyPassSSD2: "My Passport SSD",
  LaCieRugged32: "Rugged 2TB",
  A737PowerBank: "737 Power Bank",
  Airmega150: "Airmega 150",
};

/**
 * @typedef {{ brand: string, model: string, evidenceKo: string, memoKo: string, evidenceEn: string, memoEn: string }} ShortlistRow
 * @type {Record<string, ShortlistRow[]>}
 */
export const SHORTLIST_ROWS = {
  "2026-heatwave-blackout-home-readiness-checklist": [
    {
      brand: "Anker",
      model: "C1000X",
      evidenceKo: "공식몰 GaN·PD 입력 W",
      memoKo: "GaN 고속 충전, 약 1kWh LFP. 아파트 현관 이동 무게대",
      evidenceEn: "Official GaN / PD input watts",
      memoEn: "GaN fast AC recharge, ~1 kWh LFP; apartment-door carry weight",
    },
    {
      brand: "EcoFlow",
      model: "DELTA 2 Max",
      evidenceKo: "제조사 확장팩·태양광 입력 스펙",
      memoKo: "확장 배터리·고입력 태양광. 냉장고 기동 전류 여유",
      evidenceEn: "Maker extra-battery / solar input spec",
      memoEn: "Expandable pack + high solar input; fridge surge headroom",
    },
    {
      brand: "BLUETTI",
      model: "AC180",
      evidenceKo: "공개 Wh·무게 스펙시트",
      memoKo: "용량 대비 본체 크기. 베란다·현관 단기 정전에 유리",
      evidenceEn: "Published Wh vs weight sheet",
      memoEn: "Wh-per-kilo for balcony/entryway short outages",
    },
    {
      brand: "Jackery",
      model: "Explorer 1000 v2",
      evidenceKo: "공식 패스스루·앱 페이지",
      memoKo: "패스스루 충전·앱 잔량. 복구 전력 때 상시 연결",
      evidenceEn: "Official pass-through / app page",
      memoEn: "Pass-through + app SoC; stay plugged during restoration",
    },
    {
      brand: "Goal Zero",
      model: "Yeti 400X",
      evidenceKo: "공개 Wh·출력 상한",
      memoKo: "저용량 조명·통신 키트. 냉장고 연속 가동은 비권장",
      evidenceEn: "Published Wh and output cap",
      memoEn: "Small lighting/comms kit; not a fridge runtime pick",
    },
  ],
  "2026-portable-power-stations-buying-guide": [
    {
      brand: "EcoFlow",
      model: "DELTA 2 Max",
      evidenceKo: "LFP 사이클·UPS 전환 스펙",
      memoKo: "확장팩·UPS 전환. 상시 대기보다 용량 확장에 맞음",
      evidenceEn: "LFP cycle / UPS switchover spec",
      memoEn: "Expander + UPS switchover; sized for capacity growth",
    },
    {
      brand: "Jackery",
      model: "Explorer 1000 v2",
      evidenceKo: "공식 입력 W·앱",
      memoKo: "패스스루와 앱. 캠핑 복귀 후 바로 재충전",
      evidenceEn: "Official input watts / app",
      memoEn: "Pass-through and app; recharge as soon as shore power returns",
    },
    {
      brand: "BLUETTI",
      model: "AC180",
      evidenceKo: "공개 무게·출력",
      memoKo: "1kWh급에서 이동성. 차량 트렁크 수납",
      evidenceEn: "Published weight / output",
      memoEn: "1 kWh-class portability; trunk-friendly",
    },
    {
      brand: "Anker",
      model: "C1000X",
      evidenceKo: "공식몰 GaN 충전",
      memoKo: "GaN 고속 충전. 정전 키트와 캠핑을 한 대로",
      evidenceEn: "Official GaN recharge",
      memoEn: "GaN fast recharge; one unit for outage kit and camping",
    },
    {
      brand: "Goal Zero",
      model: "Yeti 1000X",
      evidenceKo: "공개 모듈·앱 스펙",
      memoKo: "모듈형 액세서리 생태계. 본체만 보면 가성비는 약함",
      evidenceEn: "Published module / app spec",
      memoEn: "Accessory ecosystem; the brick alone is not the value story",
    },
  ],
  "2026-portable-ssd-explainer": [
    {
      brand: "Samsung",
      model: "T7 Shield 2TB",
      evidenceKo: "공식 내충격·IP 스펙",
      memoKo: "IP65 하우징. 가방 안 충격·물기 대비",
      evidenceEn: "Official drop / IP rating",
      memoEn: "IP65 shell for bag drops and splash",
    },
    {
      brand: "SanDisk",
      model: "Extreme Pro 2TB",
      evidenceKo: "공개 연속 쓰기 스펙",
      memoKo: "고속 연속 쓰기. 영상 덤프에 유리, 발열 주의",
      evidenceEn: "Published sustained-write spec",
      memoEn: "Sustained write for video dumps; watch thermal throttle",
    },
    {
      brand: "Crucial",
      model: "X10 Pro 4TB",
      evidenceKo: "공식 용량·USB4 페이지",
      memoKo: "4TB·고대역. 노트북 포트가 USB4인지 먼저 확인",
      evidenceEn: "Official capacity / USB4 page",
      memoEn: "4TB and high bandwidth; confirm the laptop is USB4 first",
    },
    {
      brand: "WD",
      model: "My Passport SSD",
      evidenceKo: "공개 암호화 스펙",
      memoKo: "하드웨어 암호화. 속도보다 휴대 백업 비밀번호",
      evidenceEn: "Published hardware-encryption spec",
      memoEn: "Hardware encryption over peak speed; password the travel copy",
    },
    {
      brand: "LaCie",
      model: "Rugged 2TB",
      evidenceKo: "공식 내구성 페이지",
      memoKo: "범퍼 하우징. 필드 이동, 책상 SSD 대용은 과함",
      evidenceEn: "Official ruggedization page",
      memoEn: "Bumper shell for field carry; overkill as a desk SSD",
    },
  ],
  "2026-solo-apartment-home-essentials-checklist-guide-20260723": [
    {
      brand: "Levoit",
      model: "Core 300S",
      evidenceKo: "공개 CADR·앱 스펙",
      memoKo: "원룸 CADR·앱 스케줄. 필터 TCO를 3년에 넣으세요",
      evidenceEn: "Published CADR / app spec",
      memoEn: "Studio CADR + app schedule; put filter TCO on the 3-year bill",
    },
    {
      brand: "Dreo",
      model: "DR-HSH004",
      evidenceKo: "공개 W·전도 스위치",
      memoKo: "저소음 PTC. 원룸 회로 용량부터 확인",
      evidenceEn: "Published watts / tip-over switch",
      memoEn: "Quiet PTC heat; check the studio circuit before the dB claim",
    },
    {
      brand: "Anker",
      model: "A1257 PD",
      evidenceKo: "공식 PD 출력 W",
      memoKo: "고속 PD 보조배터리. 멀티탭 여유를 대체하지 않음",
      evidenceEn: "Official PD watt output",
      memoEn: "High-watt PD bank; it does not replace spare outlets",
    },
    {
      brand: "Cosori",
      model: "CAF-LI211",
      evidenceKo: "공개 바스켓 L·W",
      memoKo: "컴팩트 바스켓. 세척 난이도가 프리셋 수보다 중요",
      evidenceEn: "Published basket liters / watts",
      memoEn: "Compact basket; washability beats preset count",
    },
    {
      brand: "eufy",
      model: "C28 Pro",
      evidenceKo: "공개 흡입력·도킹",
      memoKo: "소형 도킹. 원룸 문턱·케이블 걸림부터 재세요",
      evidenceEn: "Published suction / dock spec",
      memoEn: "Compact dock; measure thresholds and cable snags first",
    },
    {
      brand: "Roborock",
      model: "Q Revo",
      evidenceKo: "공개 열세척·맵핑",
      memoKo: "열세척 도킹. 1인 가구엔 풋프린트가 클 수 있음",
      evidenceEn: "Published hot-wash / mapping spec",
      memoEn: "Hot-wash dock; footprint can be large for one person",
    },
  ],
};

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function joinTableRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function unmashModel(token) {
  const raw = String(token || "").trim();
  return MODEL_DISPLAY[raw] || raw.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
}

export function formatShortlistTable(locale, rows) {
  const headers =
    locale === "ko"
      ? ["브랜드", "모델", "근거", "메모"]
      : ["Brand", "Model", "Evidence", "Note"];
  const data = rows.map((row) =>
    locale === "ko"
      ? [row.brand, row.model, row.evidenceKo, row.memoKo]
      : [row.brand, row.model, row.evidenceEn, row.memoEn],
  );
  return [
    joinTableRow(headers),
    joinTableRow(headers.map(() => "---")),
    ...data.map(joinTableRow),
  ].join("\n");
}

export function hasClonedShortlistCells(body) {
  const lines = String(body || "").split("\n");
  for (let i = 0; i < lines.length - 2; i += 1) {
    if (!lines[i].trim().startsWith("|") || !isSeparatorRow(lines[i + 1])) continue;
    const headers = splitTableRow(lines[i]);
    const evidenceIdx = headers.findIndex((h) => /^(근거|evidence|basis)$/i.test(h));
    const memoIdx = headers.findIndex((h) => /^(메모|노트|note|memo|notes)$/i.test(h));
    if (evidenceIdx < 0 && memoIdx < 0) continue;
    const rows = [];
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j += 1) {
      rows.push(splitTableRow(lines[j]));
    }
    if (rows.length < 2) continue;
    const same = (idx) => {
      if (idx < 0) return false;
      const first = rows[0][idx] ?? "";
      return Boolean(first) && rows.every((row) => row[idx] === first);
    };
    if (same(evidenceIdx) || same(memoIdx)) return true;
  }
  return false;
}

function rewriteTableBlock(block, locale, catalog) {
  const headers = splitTableRow(block[0]);
  const dataRows = block.slice(2).map(splitTableRow);
  if (dataRows.length < 2) return { lines: block, changed: false };

  const modelIdx = headers.findIndex((h) => /^(모델|model)$/i.test(h));
  const brandIdx = headers.findIndex((h) => /^(브랜드|brand)$/i.test(h));
  const evidenceIdx = headers.findIndex((h) => /^(근거|evidence|basis)$/i.test(h));
  const memoIdx = headers.findIndex((h) => /^(메모|노트|note|memo|notes)$/i.test(h));

  let changed = false;
  const nextRows = dataRows.map((row) => {
    const copy = [...row];
    if (modelIdx >= 0) {
      const unmashed = unmashModel(copy[modelIdx]);
      if (unmashed !== copy[modelIdx]) {
        copy[modelIdx] = unmashed;
        changed = true;
      }
    }
    return copy;
  });

  const clonedEvidence =
    evidenceIdx >= 0 &&
    nextRows.length >= 2 &&
    nextRows.every((row) => row[evidenceIdx] === nextRows[0][evidenceIdx]);
  const clonedMemo =
    memoIdx >= 0 &&
    nextRows.length >= 2 &&
    nextRows.every((row) => row[memoIdx] === nextRows[0][memoIdx]);

  if (catalog?.length && (clonedEvidence || clonedMemo || changed)) {
    const byBrand = new Map(catalog.map((row) => [row.brand.toLowerCase(), row]));
    const byModel = new Map(
      catalog.map((row) => [row.model.toLowerCase().replace(/\s+/g, ""), row]),
    );
    nextRows.forEach((row) => {
      const brand = (row[brandIdx] || "").toLowerCase();
      const modelKey = String(row[modelIdx] || "")
        .toLowerCase()
        .replace(/\s+/g, "");
      const hit = byBrand.get(brand) || byModel.get(modelKey);
      if (!hit) return;
      if (modelIdx >= 0 && row[modelIdx] !== hit.model) {
        row[modelIdx] = hit.model;
        changed = true;
      }
      if (evidenceIdx >= 0) {
        const next = locale === "ko" ? hit.evidenceKo : hit.evidenceEn;
        if (row[evidenceIdx] !== next) {
          row[evidenceIdx] = next;
          changed = true;
        }
      }
      if (memoIdx >= 0) {
        const next = locale === "ko" ? hit.memoKo : hit.memoEn;
        if (row[memoIdx] !== next) {
          row[memoIdx] = next;
          changed = true;
        }
      }
    });
  }

  if (!changed) return { lines: block, changed: false };
  return {
    changed: true,
    lines: [
      joinTableRow(headers),
      block[1],
      ...nextRows.map(joinTableRow),
    ],
  };
}

/**
 * Unmash mashed OEM tokens and rewrite cloned 근거/메모 from the slug catalog.
 * Then apply core pipeline sanitize (comments, numbered stump, leftover clones).
 */
export function repairShortlistTables(body, locale = "ko", slug = "") {
  const catalog = SHORTLIST_ROWS[slug] || [];
  const lines = String(body || "").split("\n");
  const out = [];
  let i = 0;
  let tableChanged = false;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (line.trim().startsWith("|") && next && isSeparatorRow(next)) {
      const block = [line, next];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        block.push(lines[i]);
        i += 1;
      }
      const rewritten = rewriteTableBlock(block, locale, catalog);
      if (rewritten.changed) tableChanged = true;
      out.push(...rewritten.lines);
      continue;
    }
    out.push(line);
    i += 1;
  }

  const repairedTables = out.join("\n");
  const sanitized = sanitizePipelineArtifacts(repairedTables);
  return {
    body: sanitized,
    changed: tableChanged || sanitized !== String(body || ""),
    tableChanged,
    strippedComments: hasPipelineHtmlComment(body) && !hasPipelineHtmlComment(sanitized),
    strippedAnchor: hasOrphanShortlistAnchor(body) && !hasOrphanShortlistAnchor(sanitized),
  };
}
