/**
 * Official manufacturer Press Kit / Media Gallery assets for model-deep-dive.
 *
 * Policy:
 * - ONLY download from allowlisted newsroom / press hosts (editorial press kits).
 * - Auto-discover via Serper image search (site:newsroom) when curated URLs empty.
 * - Never scrape retail storefronts or random OEM marketing CDNs.
 * - Always attribute: brand + "Official Press Kit / Media Gallery".
 * - Prefer press-kit product cuts for cover + body; fall back to Pexels/Pixabay stock.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  hashBuffer,
  hashImageContent,
  loadImageRegistry,
  registerUsedImage,
  saveImageRegistry,
  syncImageRegistryFromPosts,
  assetKey,
} from "./used-images.mjs";

/** Host suffixes allowed for press-kit downloads (editorial distribution). */
export const PRESS_KIT_ALLOWED_HOST_SUFFIXES = [
  "apple.com",
  "news.samsung.com",
  "samsungmobilepress.com",
  "api.samsungmobilepress.com",
  "img.global.news.samsung.com",
  "news.lg.com",
  "lgnewsroom.com",
  "news.sony.com",
  "sony.com",
  "playstation.com",
  "newsroom.ibm.com",
  "news.microsoft.com",
  "blogs.nvidia.com",
  "nvidianews.nvidia.com",
  "newsroom.intel.com",
  "corporate.dyson.com",
  "news.dyson.com",
  "media.dyson.com",
  // Audio brands — newsroom / media press assets only
  "jbl.com",
  "harman.com",
  "news.harman.com",
  "bose.com",
  "assets.bose.com",
  "ultimateears.com",
  "logitech.com",
  "marshall.com",
  "marshallheadphones.com",
];

/**
 * @typedef {{
 *   url: string,
 *   role?: 'cover'|'lifestyle'|'detail',
 *   altHint?: string,
 *   altHintKo?: string,
 * }} PressKitImage
 *
 * @typedef {{
 *   brand: string,
 *   modelName: string,
 *   modelNameKo?: string,
 *   galleryUrl: string,
 *   licenseNote?: string,
 *   images: PressKitImage[],
 * }} PressKitEntry
 */

const BRAND_SITE_FILTERS = {
  Samsung:
    "site:news.samsung.com OR site:samsungmobilepress.com OR site:img.global.news.samsung.com",
  Apple: "site:apple.com/newsroom",
  LG: "site:news.lg.com OR site:lgnewsroom.com",
  Sony: "site:sony.com OR site:news.sony.com OR site:playstation.com",
  Microsoft: "site:news.microsoft.com",
  Google: "site:blog.google OR site:store.google.com",
  Dyson: "site:dyson.com OR site:news.dyson.com",
  Nintendo: "site:nintendo.com",
  JBL: "site:jbl.com OR site:harman.com OR site:news.harman.com",
  Harman: "site:harman.com OR site:news.harman.com OR site:jbl.com",
  Bose: "site:bose.com OR site:assets.bose.com",
  "Ultimate Ears": "site:ultimateears.com OR site:logitech.com",
  UE: "site:ultimateears.com OR site:logitech.com",
  Marshall: "site:marshall.com OR site:marshallheadphones.com",
};

/** Optional hand-curated seeds (auto-discover fills the rest). */
export const PRESS_KIT_BY_MODEL_ID = {
  "galaxy-z-fold-6": {
    brand: "Samsung",
    modelName: "Galaxy Z Fold6",
    modelNameKo: "갤럭시 Z 폴드6",
    galleryUrl: "https://www.samsungmobilepress.com/media-assets/galaxy-z-fold6",
    licenseNote:
      "Samsung Mobile Press / Newsroom media assets for editorial coverage of Galaxy Z Fold6.",
    images: [],
  },
  "galaxy-s25-ultra": {
    brand: "Samsung",
    modelName: "Galaxy S25 Ultra",
    modelNameKo: "갤럭시 S25 울트라",
    galleryUrl: "https://www.samsungmobilepress.com/media-assets",
    licenseNote: "Samsung Mobile Press assets for editorial Galaxy S25 Ultra coverage.",
    images: [],
  },
  "iphone-16-pro": {
    brand: "Apple",
    modelName: "iPhone 16 Pro",
    modelNameKo: "아이폰 16 Pro",
    galleryUrl:
      "https://www.apple.com/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/",
    licenseNote:
      "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [],
  },
  "iphone-16-pro-max": {
    brand: "Apple",
    modelName: "iPhone 16 Pro Max",
    modelNameKo: "아이폰 16 Pro Max",
    galleryUrl:
      "https://www.apple.com/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/",
    licenseNote:
      "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [],
  },
  "macbook-air-m3": {
    brand: "Apple",
    modelName: "MacBook Air M3",
    modelNameKo: "맥북 에어 M3",
    galleryUrl:
      "https://www.apple.com/newsroom/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/",
    licenseNote: "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [],
  },
  "jbl-flip-7": {
    brand: "JBL",
    modelName: "Flip 7",
    modelNameKo: "Flip 7",
    galleryUrl: "https://www.jbl.com/",
    licenseNote: "JBL / Harman official press or media assets for editorial Flip 7 coverage.",
    images: [],
  },
  "ue-boom-4": {
    brand: "Ultimate Ears",
    modelName: "Boom 4",
    modelNameKo: "Boom 4",
    galleryUrl: "https://www.ultimateears.com/",
    licenseNote: "Ultimate Ears / Logitech official press assets for editorial Boom 4 coverage.",
    images: [],
  },
  "sony-srs-xe300": {
    brand: "Sony",
    modelName: "SRS-XE300",
    modelNameKo: "SRS-XE300",
    galleryUrl: "https://www.sony.com/",
    licenseNote: "Sony official press / newsroom assets for editorial SRS-XE300 coverage.",
    images: [],
  },
  "sony-xg500": {
    brand: "Sony",
    modelName: "SRS-XG500",
    modelNameKo: "소니 SRS-XG500",
    galleryUrl: "https://www.sony.com/",
    licenseNote: "Sony official press / newsroom assets for editorial SRS-XG500 coverage.",
    images: [],
  },
};

export function getPressKitEntry(modelId) {
  if (!modelId) return null;
  return PRESS_KIT_BY_MODEL_ID[modelId] ?? null;
}

/** Build a synthetic entry from model pick when not in the seed catalog. */
export function resolvePressKitEntry(model) {
  const seeded = getPressKitEntry(model?.id);
  if (seeded) {
    return {
      ...seeded,
      modelName: model?.name || seeded.modelName,
      modelNameKo: model?.nameKo || seeded.modelNameKo,
      brand: model?.brand || seeded.brand,
    };
  }
  if (!model?.brand || !model?.name) return null;
  return {
    brand: model.brand,
    modelName: model.name,
    modelNameKo: model.nameKo || model.name,
    galleryUrl: guessGalleryUrl(model.brand, model.name),
    licenseNote: `${model.brand} official press / media gallery (auto-discovered).`,
    images: [],
  };
}

function guessGalleryUrl(brand, name) {
  const b = String(brand).toLowerCase();
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (b.includes("samsung")) {
    return `https://www.samsungmobilepress.com/media-assets/${slug}`;
  }
  if (b.includes("apple")) {
    return "https://www.apple.com/newsroom/";
  }
  if (b.includes("lg")) return "https://www.lgnewsroom.com/";
  if (b.includes("jbl") || b.includes("harman")) return "https://www.jbl.com/";
  if (b.includes("bose")) return "https://www.bose.com/";
  if (b.includes("ultimate") || b === "ue") return "https://www.ultimateears.com/";
  if (b.includes("marshall")) return "https://www.marshall.com/";
  if (b.includes("sony")) return "https://www.sony.com/";
  return `https://www.google.com/search?q=${encodeURIComponent(`${brand} ${name} press kit`)}`;
}

/**
 * Parse brand/model pairs from comparison titles like
 * "JBL Flip 7 vs UE Boom 4 vs Sony SRS-XE300".
 * @param {string} title
 * @returns {Array<{ id: string, brand: string, name: string }>}
 */
export function parseModelsFromTitle(title) {
  const raw = String(title || "");
  if (!raw.trim()) return [];
  const parts = raw
    .split(/\s+vs\.?\s+|\s+VS\s+|,\s*(?=[A-Z])/i)
    .map((p) => p.replace(/^.*?:\s*/, "").trim())
    .filter(Boolean);

  const brandPatterns = [
    { re: /\bJBL\b/i, brand: "JBL" },
    { re: /\bUE\b|\bUltimate Ears\b/i, brand: "Ultimate Ears" },
    { re: /\bBose\b/i, brand: "Bose" },
    { re: /\bSony\b/i, brand: "Sony" },
    { re: /\bMarshall\b/i, brand: "Marshall" },
    { re: /\bSamsung\b/i, brand: "Samsung" },
    { re: /\bApple\b|\biPhone\b|\bMacBook\b/i, brand: "Apple" },
    { re: /\bLG\b/i, brand: "LG" },
    { re: /\bDyson\b/i, brand: "Dyson" },
  ];

  const out = [];
  for (const part of parts.slice(0, 4)) {
    let brand = null;
    for (const bp of brandPatterns) {
      if (bp.re.test(part)) {
        brand = bp.brand;
        break;
      }
    }
    if (!brand) continue;
    const name = part
      .replace(new RegExp(brand, "ig"), "")
      .replace(/\bUltimate Ears\b/ig, "")
      .replace(/[—–|:·].*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!name || name.length < 2) continue;
    const id = `${brand}-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    out.push({ id, brand, name });
  }
  return out;
}

export function isPressKitUrlAllowed(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return PRESS_KIT_ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function buildPressKitCredit(entry) {
  const brand = entry?.brand ?? "Manufacturer";
  return `Official press image courtesy of ${brand} (Press Kit / Media Gallery)`;
}

export function buildPressKitCreditKo(entry) {
  const brand = entry?.brand ?? "제조사";
  return `${brand} 공식 프레스킷·미디어 갤러리 제공 이미지`;
}

function hashSlug(slug, salt = "") {
  return crypto.createHash("sha256").update(`${slug}:${salt}`).digest("hex").slice(0, 10);
}

function cachePath(rootDir) {
  return path.join(rootDir, "data/automation/press-kit-cache.json");
}

function loadCache(rootDir) {
  const file = cachePath(rootDir);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(rootDir, cache) {
  const file = cachePath(rootDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cache, null, 2)}\n`);
}

function buildSerperQuery(brand, name) {
  const site =
    BRAND_SITE_FILTERS[brand] ??
    `site:${brand.toLowerCase()}.com newsroom OR press`;
  return `${name} ${brand} official press product OR media kit ${site}`;
}

/**
 * Auto-discover press images via Serper (Google Images) limited to newsroom hosts.
 */
export async function discoverPressKitImages(model, options = {}) {
  const count = Math.max(1, Math.min(6, options.count ?? 4));
  const rootDir = options.rootDir ?? process.cwd();
  const brand = model?.brand;
  const name = model?.name;
  if (!brand || !name) return [];

  const cacheKey = `${model.id || `${brand}:${name}`}`.toLowerCase();
  const cache = loadCache(rootDir);
  const hit = cache[cacheKey];
  if (
    hit?.at &&
    Date.now() - new Date(hit.at).getTime() < 7 * 24 * 3600 * 1000 &&
    Array.isArray(hit.images) &&
    hit.images.length > 0
  ) {
    console.log(`Press-kit cache hit: ${cacheKey} (${hit.images.length})`);
    return hit.images.slice(0, count);
  }

  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    console.warn("Press-kit auto-discover skipped: SERPER_API_KEY missing");
    return [];
  }

  const q = buildSerperQuery(brand, name);
  console.log(`Press-kit auto-discover: ${q}`);

  let data;
  try {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, num: 10 }),
    });
    if (!response.ok) {
      throw new Error(`Serper images ${response.status}`);
    }
    data = await response.json();
  } catch (err) {
    console.warn(`Press-kit Serper failed: ${err.message}`);
    return [];
  }

  const roles = ["cover", "lifestyle", "detail", "detail"];
  const seen = new Set();
  const images = [];

  for (const row of data.images ?? []) {
    const url = row.imageUrl || row.link;
    if (!url || !isPressKitUrlAllowed(url)) continue;
    if (seen.has(url)) continue;
    const w = Number(row.imageWidth || 0);
    const h = Number(row.imageHeight || 0);
    if (w > 0 && h > 0 && (w < 500 || h < 300)) continue;
    seen.add(url);
    images.push({
      url,
      role: roles[images.length] ?? "detail",
      altHint: `${brand} ${name} official press kit product photo`,
      altHintKo: `${brand} ${name} 공식 프레스킷 제품컷`,
    });
    if (images.length >= count) break;
  }

  if (images.length < 2 && brand === "Apple") {
    const entry = resolvePressKitEntry(model);
    const fromHtml = await scrapeAppleNewsroomImages(
      entry?.galleryUrl,
      brand,
      name,
    );
    for (const img of fromHtml) {
      if (images.some((i) => i.url === img.url)) continue;
      images.push(img);
      if (images.length >= count) break;
    }
  }

  cache[cacheKey] = { at: new Date().toISOString(), query: q, images };
  saveCache(rootDir, cache);
  console.log(`Press-kit discovered ${images.length} allowlisted URL(s) for ${name}`);
  return images;
}

async function scrapeAppleNewsroomImages(galleryUrl, brand, name) {
  if (!galleryUrl || !galleryUrl.includes("apple.com/newsroom")) return [];
  try {
    const res = await fetch(galleryUrl, {
      headers: {
        "User-Agent":
          "AIPickEditorialBot/1.0 (+https://www.aipick.shop; press-kit editorial fetch)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const urls = [
      ...html.matchAll(
        /https:\/\/www\.apple\.com\/newsroom\/images\/[^"'\\\s>]+\.jpg(?:\.large\.jpg)?/g,
      ),
    ].map((m) => m[0]);
    const uniq = [...new Set(urls)].filter(isPressKitUrlAllowed).slice(0, 4);
    const roles = ["cover", "lifestyle", "detail", "detail"];
    return uniq.map((url, i) => ({
      url,
      role: roles[i] ?? "detail",
      altHint: `${brand} ${name} official Apple Newsroom press photo`,
      altHintKo: `${brand} ${name} 애플 뉴스룸 공식 프레스 사진`,
    }));
  } catch {
    return [];
  }
}

async function downloadUrl(url, destPath) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "AIPickEditorialBot/1.0 (+https://www.aipick.shop; press-kit editorial fetch)",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Press-kit download ${response.status} for ${url}`);
  }
  const contentType = String(response.headers.get("content-type") ?? "");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 8_000) {
    throw new Error("Press-kit image too small — likely not a product cut");
  }
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const isWebp = buffer.slice(8, 12).toString("ascii") === "WEBP";
  if (
    contentType &&
    !contentType.startsWith("image/") &&
    contentType !== "application/octet-stream" &&
    !isJpeg &&
    !isPng &&
    !isWebp
  ) {
    throw new Error(`Press-kit URL not image (${contentType})`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  return buffer;
}

/**
 * Download press-kit images (curated + auto-discovered) into public/images/posts/{slug}/.
 */
export async function fetchPressKitImages(slug, model, options = {}) {
  const count = Math.max(1, Math.min(3, options.count ?? 2));
  const rootDir = options.rootDir ?? process.cwd();
  const entry = resolvePressKitEntry(model);
  if (!entry) {
    return { entry: null, images: [] };
  }

  const preferRoles = options.preferRoles ?? ["cover", "lifestyle", "detail"];

  let candidates = [...(entry.images ?? [])];
  if (candidates.filter((c) => c?.url && isPressKitUrlAllowed(c.url)).length < count) {
    const discovered = await discoverPressKitImages(model, {
      count: Math.max(count, 4),
      rootDir,
    });
    for (const d of discovered) {
      if (!candidates.some((c) => c.url === d.url)) candidates.push(d);
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    const ai = preferRoles.indexOf(a.role ?? "detail");
    const bi = preferRoles.indexOf(b.role ?? "detail");
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const usable = sorted.filter((img) => img?.url && isPressKitUrlAllowed(img.url));
  if (usable.length === 0) {
    console.log(
      `Press kit: no allowlisted images yet for ${entry.modelName} (gallery ${entry.galleryUrl})`,
    );
    return { entry, images: [] };
  }

  let registry = syncImageRegistryFromPosts();
  const out = [];
  const credit = buildPressKitCredit(entry);
  const creditKo = buildPressKitCreditKo(entry);

  for (let i = 0; i < usable.length && out.length < count; i++) {
    const img = usable[i];
    const role = img.role ?? "detail";
    const filename = `press-${role}-${hashSlug(slug, img.url)}.jpg`;
    const relativePath = `/images/posts/${slug}/${filename}`;
    const destPath = path.join(rootDir, "public", relativePath.replace(/^\//, ""));

    try {
      const buffer = await downloadUrl(img.url, destPath);
      const key = assetKey("press-kit", hashSlug(slug, img.url));

      registerUsedImage(registry, {
        slug,
        url: img.url,
        assetKey: key,
        hash: hashBuffer(buffer),
        contentHash: hashImageContent(buffer),
        provider: "press-kit",
      });
      saveImageRegistry(registry);
      registry = loadImageRegistry();

      const altEn =
        img.altHint ??
        `${entry.brand} ${entry.modelName} official press kit product photo`;
      const altKo =
        img.altHintKo ??
        `${entry.brand} ${entry.modelNameKo ?? entry.modelName} 공식 프레스킷 제품컷`;

      console.log(`Press-kit image: ${slug} ← ${img.url.slice(0, 90)}…`);

      out.push({
        path: relativePath,
        role,
        credit,
        creditKo,
        source: "press-kit",
        sourceUrl: img.url,
        galleryUrl: entry.galleryUrl,
        altEn: altEn.slice(0, 180),
        altKo: altKo.slice(0, 180),
        provider: "press-kit",
        assetId: hashSlug(slug, img.url),
      });
    } catch (err) {
      console.warn(`Press-kit fetch failed (${role}): ${err.message}`);
      try {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } catch {
        /* ignore */
      }
    }
  }

  return { entry, images: out };
}

/** Merge press-kit figures with stock figures (press first, then stock fill). */
export function mergePressAndStockFigures(pressImages, stockFigures, target = 2) {
  const merged = [];
  for (const p of pressImages ?? []) {
    if (merged.length >= target) break;
    merged.push({
      path: p.path,
      altEn: p.altEn,
      altKo: p.altKo,
      credit: p.credit,
      creditKo: p.creditKo,
      source: "press-kit",
    });
  }
  for (const s of stockFigures ?? []) {
    if (merged.length >= target) break;
    if (merged.some((m) => m.path === s.path)) continue;
    merged.push({
      path: s.path,
      altEn: s.altEn,
      altKo: s.altKo,
      credit: s.credit,
      source: "stock",
    });
  }
  return merged;
}
