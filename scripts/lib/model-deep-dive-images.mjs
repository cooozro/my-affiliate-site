/**
 * Model-deep-dive visuals — copyright-safe stock (Pexels/Pixabay) only.
 * Never scrape OEM marketing sites. ALT names the focus model for SEO;
 * credit line discloses stock source.
 */

/** Generic category product-cut queries (no trademarked SKU as search key). */
const TOPIC_PRODUCT_QUERIES = {
  "flagship-smartphones": [
    "foldable smartphone open product photo",
    "flagship smartphone on desk lifestyle",
    "modern smartphone hands-on review",
  ],
  "budget-smartphones": [
    "budget smartphone product photo desk",
    "android phone on table lifestyle",
  ],
  "wireless-earbuds": [
    "wireless earbuds product photo case",
    "true wireless earbuds on desk",
  ],
  "noise-cancelling-headphones": [
    "over ear headphones product photo",
    "noise cancelling headphones desk",
  ],
  "bluetooth-speakers": [
    "portable bluetooth speaker outdoor product",
    "wireless speaker product photo",
  ],
  laptops: [
    "ultrabook laptop open desk product photo",
    "laptop workspace product lifestyle",
  ],
  "budget-monitors": [
    "computer monitor desk setup product",
    "IPS monitor product photo",
  ],
  "robot-vacuums": [
    "robot vacuum cleaner floor product photo",
    "robot vacuum docking station home",
  ],
  "cordless-vacuums": [
    "cordless stick vacuum product photo",
    "handheld vacuum cleaner home",
  ],
  "air-purifiers": [
    "HEPA air purifier product photo living room",
    "air purifier appliance desk",
  ],
  television: [
    "OLED TV living room product photo",
    "flat screen television wall mount",
  ],
  refrigerators: [
    "modern refrigerator kitchen product photo",
    "french door fridge kitchen",
  ],
  "washing-machines": [
    "front load washing machine laundry product",
  ],
  "clothes-dryers": ["clothes dryer laundry room product"],
  "portable-ac": ["portable air conditioner room product photo"],
  "window-ac": ["window air conditioner apartment product"],
  "electric-fans": ["tower fan room product photo"],
  dehumidifiers: ["dehumidifier home product photo"],
  "air-fryers": ["air fryer kitchen countertop product"],
  "rice-cookers": ["electric rice cooker kitchen product"],
  "coffee-machines": ["espresso coffee machine kitchen product"],
  "induction-cooktops": ["induction cooktop kitchen product"],
  dishwashers: ["dishwasher kitchen appliance product"],
  humidifiers: ["humidifier bedroom product photo"],
  "space-heaters": ["space heater room product photo"],
  "electric-blankets": ["electric blanket bed product"],
  bidets: ["bidet toilet seat bathroom product"],
  "water-purifiers": ["water purifier kitchen dispenser product"],
  "tablet-budget": ["tablet device desk product photo"],
  "power-banks": ["portable power bank charging phone product"],
  "portable-ssd": ["portable SSD external drive product"],
  "usb-c-hubs": ["USB-C hub laptop desk product"],
  "mechanical-keyboards": ["mechanical keyboard desk product photo"],
  webcams: ["webcam video conference product photo"],
  "fitness-trackers": ["fitness tracker smartwatch wrist product"],
  "gaming-consoles": ["game console living room product photo"],
  "action-cameras": ["action camera outdoor product photo"],
  "smart-home-cameras": ["home security camera indoor product"],
};

/**
 * @param {{ id?: string, brand?: string, name?: string, nameKo?: string }} model
 * @param {{ id?: string, imageQuery?: string }} topic
 */
export function buildModelDeepDiveSearchQueries(model, topic) {
  const topicId = topic?.id ?? "";
  const brand = model?.brand ?? "";
  const category = TOPIC_PRODUCT_QUERIES[topicId] ?? [
    topic?.imageQuery ?? "consumer electronics product photo",
    "gadget product photo desk",
  ];

  return [
    ...category,
    brand ? `${brand} ${category[0]}` : null,
    "product photography electronics lifestyle",
  ].filter(Boolean);
}

/**
 * @param {{ brand?: string, name?: string, nameKo?: string }} model
 * @param {string} topicId
 * @param {'cover'|'lifestyle'|'detail'} role
 */
export function buildModelDeepDiveAlts(model, topicId, role = "cover") {
  const brand = model?.brand ?? "Featured";
  const name = model?.name ?? "product";
  const nameKo = model?.nameKo ?? name;
  const roleEn =
    role === "lifestyle"
      ? "in a real-world lifestyle setting"
      : role === "detail"
        ? "product detail angle for editorial review"
        : "product cut for editorial deep-dive review";
  const roleKo =
    role === "lifestyle"
      ? "실사용 라이프스타일 장면"
      : role === "detail"
        ? "편집부 리뷰용 디테일 컷"
        : "편집부 딥다이브용 제품 컷";

  return {
    en: `${brand} ${name} ${roleEn} (stock photo illustration)`.slice(0, 180),
    ko: `${brand} ${nameKo} ${roleKo} (스톡 일러스트 사진)`.slice(0, 180),
  };
}

/**
 * Insert 1–2 markdown figures after Design / Spec H2 (EN or KO).
 * @param {string} body
 * @param {Array<{ path: string, altEn: string, altKo: string, credit?: string }>} images
 * @param {'en'|'ko'} locale
 */
export function insertModelDeepDiveBodyImages(body, images, locale = "en") {
  if (!images?.length) return body;
  let out = body;

  const slots =
    locale === "ko"
      ? [
          {
            re: /^##\s*(디자인과 실사용|디자인과 일상|디자인)\s*$/m,
            idx: 0,
          },
          {
            re: /^##\s*(한눈에 보는 스펙|핵심 성능|스펙)\s*$/m,
            idx: 1,
          },
        ]
      : [
          {
            re: /^##\s*(Design & everyday use|Design and everyday use|Design)\s*$/m,
            idx: 0,
          },
          {
            re: /^##\s*(At-a-glance spec sheet|Core performance|Spec)\s*$/m,
            idx: 1,
          },
        ];

  const caption =
    locale === "ko"
      ? (img) =>
          img.credit
            ? `\n*이미지: ${img.credit} — 저작권 안전한 스톡 사진(제품 카테고리 일러스트).*\n`
            : "\n*이미지: 저작권 안전한 스톡 사진(제품 카테고리 일러스트).*\n"
      : (img) =>
          img.credit
            ? `\n*Image: ${img.credit} — copyright-safe stock (category illustration).*\n`
            : "\n*Image: copyright-safe stock (category illustration).*\n";

  for (const slot of slots) {
    const img = images[slot.idx] ?? images[0];
    if (!img?.path) continue;
    if (out.includes(img.path)) continue;
    const alt = locale === "ko" ? img.altKo : img.altEn;
    const block = `\n\n![${alt}](${img.path})\n${caption(img)}`;
    const match = out.match(slot.re);
    if (match && match.index != null) {
      const insertAt = match.index + match[0].length;
      out = out.slice(0, insertAt) + block + out.slice(insertAt);
    } else if (slot.idx === 0) {
      // Fallback: after first H2
      const firstH2 = out.search(/^##\s+/m);
      if (firstH2 >= 0) {
        const lineEnd = out.indexOf("\n", firstH2);
        const at = lineEnd >= 0 ? lineEnd : firstH2;
        out = out.slice(0, at) + block + out.slice(at);
      }
    }
  }

  return out;
}

/**
 * @param {string} body
 */
export function countBodyMarkdownImages(body) {
  return (body.match(/!\[[^\]]*]\(\/images\/posts\/[^)]+\)/g) ?? []).length;
}
