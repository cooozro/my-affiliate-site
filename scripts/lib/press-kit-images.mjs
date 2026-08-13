/**
 * Official manufacturer Press Kit / Media Gallery assets for model-deep-dive.
 *
 * Policy:
 * - ONLY download from allowlisted newsroom / press hosts (editorial press kits).
 * - Never scrape retail storefronts or random OEM marketing CDNs.
 * - Always attribute: brand + "Official Press Kit / Media Gallery".
 * - Prefer press-kit product cuts for cover + first body figure; fall back to
 *   Pexels/Pixabay stock when no curated URL is available.
 *
 * Editors: add entries under PRESS_KIT_BY_MODEL_ID when a new launch has a
 * public press gallery. Prefer direct image URLs from Newsroom "Download media".
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  hashBuffer,
  hashImageContent,
  isImageUsed,
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
  "www.lgnewsroom.com",
  "news.sony.com",
  "www.sony.com",
  "newsroom.ibm.com",
  "news.microsoft.com",
  "blogs.nvidia.com",
  "nvidianews.nvidia.com",
  "newsroom.intel.com",
  "corporate.dyson.com",
  "news.dyson.com",
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

/**
 * Curated press-kit assets keyed by popular-model-picks `id`.
 * Direct image URLs must be from allowlisted hosts (Newsroom download / media CDN).
 * @type {Record<string, PressKitEntry>}
 */
export const PRESS_KIT_BY_MODEL_ID = {
  "galaxy-z-fold-6": {
    brand: "Samsung",
    modelName: "Galaxy Z Fold6",
    modelNameKo: "갤럭시 Z 폴드6",
    galleryUrl: "https://www.samsungmobilepress.com/media-assets/galaxy-z-fold6",
    licenseNote:
      "Samsung Mobile Press / Newsroom media assets for editorial coverage of Galaxy Z Fold6.",
    images: [
      // Gallery page is public; add direct CDN URLs here when editors copy
      // "Download" links from Samsung Mobile Press (allowlisted host).
    ],
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
    images: [
      {
        url: "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-hero-geo-240909_inline.jpg.large.jpg",
        role: "cover",
        altHint: "Apple iPhone 16 Pro and iPhone 16 Pro Max official press product shot",
        altHintKo: "애플 아이폰 16 Pro·Pro Max 공식 프레스 제품컷",
      },
      {
        url: "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-finish-lineup-240909_big.jpg.large.jpg",
        role: "lifestyle",
        altHint: "iPhone 16 Pro finish lineup official Apple Newsroom image",
        altHintKo: "아이폰 16 Pro 색상 라인업 공식 프레스 이미지",
      },
      {
        url: "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-camera-system-240909_inline.jpg.large.jpg",
        role: "detail",
        altHint: "iPhone 16 Pro rear camera system official press close-up",
        altHintKo: "아이폰 16 Pro 후면 카메라 공식 프레스 클로즈업",
      },
    ],
  },
  "iphone-16-pro-max": {
    brand: "Apple",
    modelName: "iPhone 16 Pro Max",
    modelNameKo: "아이폰 16 Pro Max",
    galleryUrl:
      "https://www.apple.com/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/",
    licenseNote:
      "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [
      {
        url: "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-hero-geo-240909_inline.jpg.large.jpg",
        role: "cover",
        altHint: "Apple iPhone 16 Pro Max official press product shot",
        altHintKo: "애플 아이폰 16 Pro Max 공식 프레스 제품컷",
      },
      {
        url: "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-finish-lineup-240909_big.jpg.large.jpg",
        role: "lifestyle",
        altHint: "iPhone 16 Pro Max finish lineup official Apple Newsroom image",
        altHintKo: "아이폰 16 Pro Max 색상 라인업 공식 프레스 이미지",
      },
    ],
  },
  "macbook-air-m3": {
    brand: "Apple",
    modelName: "MacBook Air M3",
    modelNameKo: "맥북 에어 M3",
    galleryUrl:
      "https://www.apple.com/newsroom/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/",
    licenseNote: "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [
      {
        url: "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-240304_big.jpg.large.jpg",
        role: "cover",
        altHint: "MacBook Air with M3 chip official Apple Newsroom product shot",
        altHintKo: "M3 맥북 에어 공식 프레스 제품컷",
      },
    ],
  },
  "airpods-pro-2": {
    brand: "Apple",
    modelName: "AirPods Pro (2nd gen)",
    modelNameKo: "에어팟 프로 2세대",
    galleryUrl:
      "https://www.apple.com/newsroom/2023/09/apple-announces-the-advanced-new-airpods-pro-2nd-generation/",
    licenseNote: "Apple Newsroom press images — editorial use with Apple attribution.",
    images: [],
  },
  "ps5-slim": {
    brand: "Sony",
    modelName: "PlayStation 5 Slim",
    modelNameKo: "플레이스테이션 5 슬림",
    galleryUrl: "https://www.playstation.com/en-us/ps5/",
    licenseNote: "Prefer Sony Interactive press assets when URL is allowlisted.",
    images: [],
  },
};

export function getPressKitEntry(modelId) {
  if (!modelId) return null;
  return PRESS_KIT_BY_MODEL_ID[modelId] ?? null;
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
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(`Press-kit URL not image (${contentType})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 8_000) {
    throw new Error("Press-kit image too small — likely not a product cut");
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  return buffer;
}

/**
 * Download curated press-kit images for a model into public/images/posts/{slug}/.
 *
 * @param {string} slug
 * @param {{ id?: string, brand?: string, name?: string, nameKo?: string }} model
 * @param {{ count?: number, rootDir?: string, preferRoles?: string[] }} [options]
 * @returns {Promise<{
 *   entry: PressKitEntry|null,
 *   images: Array<{
 *     path: string,
 *     role: string,
 *     credit: string,
 *     creditKo: string,
 *     source: 'press-kit',
 *     sourceUrl: string,
 *     galleryUrl?: string,
 *     altEn: string,
 *     altKo: string,
 *     provider: 'press-kit',
 *     assetId: string,
 *   }>,
 * }>}
 */
export async function fetchPressKitImages(slug, model, options = {}) {
  const count = Math.max(1, Math.min(3, options.count ?? 2));
  const rootDir = options.rootDir ?? process.cwd();
  const entry = getPressKitEntry(model?.id);
  if (!entry) {
    return { entry: null, images: [] };
  }

  const preferRoles = options.preferRoles ?? ["cover", "lifestyle", "detail"];
  const sorted = [...(entry.images ?? [])].sort((a, b) => {
    const ai = preferRoles.indexOf(a.role ?? "detail");
    const bi = preferRoles.indexOf(b.role ?? "detail");
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const usable = sorted.filter((img) => img?.url && isPressKitUrlAllowed(img.url));
  if (usable.length === 0) {
    console.log(
      `Press kit: ${model.id} has gallery ${entry.galleryUrl} but no allowlisted direct image URLs yet`,
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
      if (
        isImageUsed(registry, {
          hash: hashBuffer(buffer),
          contentHash: hashImageContent(buffer),
          assetKey: key,
        })
      ) {
        // Same visual already used on another post — still OK for this model's review,
        // but register under this slug for tracking.
      }

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

      console.log(`Press-kit image: ${slug} ← ${img.url.slice(0, 80)}…`);

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

/**
 * Merge press-kit figures with stock figures (press first, then stock fill).
 * @param {Array<object>} pressImages
 * @param {Array<object>} stockFigures
 * @param {number} target
 */
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
