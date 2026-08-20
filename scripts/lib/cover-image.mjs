import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  buildCoverAlts,
  buildCoverFilename,
  BLOCKED_ASSET_IDS,
  CURATED_SLUG_ASSETS,
  resolveImageContext,
  scoreImageRelevance,
  passesProductAltGate,
  passesVacuumTypeAltGate,
  isRobotVacuumAsset,
  vacuumTopicMode,
  isPortableSpeakerTopic,
  VACUUM_TEXT_MIN_SCORE,
  DEFAULT_TEXT_MIN_SCORE,
  SPEAKER_TEXT_MIN_SCORE,
} from "./image-query.mjs";
import {
  pickVisionWinner,
  rankCandidatesWithVision,
  verifyDownloadedImage,
  visionMinScore,
  visionReasonRejected,
  visionSelectionEnabled,
} from "./image-vision.mjs";
import {
  assetKey,
  hashBuffer,
  hashImageContent,
  isImageUsed,
  loadImageRegistry,
  registerUsedImage,
  saveImageRegistry,
  syncImageRegistryFromPosts,
} from "./used-images.mjs";
import {
  fetchPressKitImages,
  parseModelsFromTitle,
} from "./press-kit-images.mjs";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const PIXABAY_SEARCH = "https://pixabay.com/api/";
const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";

const PEXELS_PHOTO = "https://api.pexels.com/v1/photos";

function unsplashAccessKey() {
  return (
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.UNSPLASH_API_KEY?.trim() ||
    ""
  );
}

const TEXT_MIN_SCORE = DEFAULT_TEXT_MIN_SCORE;

function isBlockedAsset(candidate, ctx) {
  const key = `${candidate.provider}:${candidate.assetId}`;
  if (BLOCKED_ASSET_IDS.has(key)) return true;
  if (vacuumTopicMode(ctx?.topicId, ctx?.slug) === "cordless" && isRobotVacuumAsset(candidate.provider, candidate.assetId)) {
    return true;
  }
  return false;
}

function filterBlocked(candidates, ctx) {
  return candidates.filter((c) => !isBlockedAsset(c, ctx));
}

/** Stable numeric hash from slug (provider pick + result offset). */
export function hashSlug(slug, salt = "") {
  const hex = crypto.createHash("sha256").update(`${slug}:${salt}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16);
}

export function availableImageProviders() {
  const providers = [];
  if (process.env.PEXELS_API_KEY?.trim()) providers.push("pexels");
  if (process.env.PIXABAY_API_KEY?.trim()) providers.push("pixabay");
  if (unsplashAccessKey()) providers.push("unsplash");
  return providers;
}

export function pickImageProvider(slug) {
  const providers = availableImageProviders();
  if (providers.length === 0) return null;
  if (providers.length === 1) return providers[0];
  const idx = hashSlug(slug, "provider") % providers.length;
  return providers[idx];
}

function allProviders(forced) {
  const available = availableImageProviders();
  if (forced && available.includes(forced)) {
    return [forced, ...available.filter((p) => p !== forced)];
  }
  return available;
}

function searchPage(slug, queryIndex, pageOffset = 0) {
  return (hashSlug(slug, `page:${queryIndex}:${pageOffset}`) % 4) + 1 + pageOffset;
}

async function downloadToSlug(slug, imageUrl, filename, rootDir = process.cwd()) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const relativePath = `/images/posts/${slug}/${filename}`;
  const destPath = path.join(rootDir, "public", "images", "posts", slug, filename);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);

  return { relativePath, buffer, hash: hashBuffer(buffer) };
}

function candidateIsUsed(registry, candidate) {
  return isImageUsed(registry, {
    url: candidate.imageUrl,
    assetKey: candidate.assetKey,
  });
}

function passesAnchorWithSearchQuery(altText, searchQuery, anchors) {
  if (!anchors?.length) return true;
  if (passesProductAltGate(altText, anchors)) return true;
  const query = String(searchQuery ?? "").toLowerCase();
  return anchors.every((anchor) => query.includes(String(anchor).toLowerCase()));
}

function rankText(candidates, ctx) {
  const anchors = ctx.requiredAnchors ?? [];
  return candidates
    .filter((candidate) => {
      const altText =
        String(candidate.providerAlt ?? candidate.relevanceText ?? "").trim() ||
        String(candidate.searchQuery ?? "");
      return (
        passesAnchorWithSearchQuery(altText, candidate.searchQuery, anchors) &&
        passesVacuumTypeAltGate(altText, ctx.topicId, ctx.slug)
      );
    })
    .map((candidate) => {
      const altBlob = (
        String(candidate.providerAlt ?? candidate.relevanceText ?? "").trim() ||
        String(candidate.searchQuery ?? "")
      ).toLowerCase();
      let textScore = scoreImageRelevance(
        String(candidate.providerAlt ?? candidate.relevanceText ?? "").trim() ||
          String(candidate.searchQuery ?? ""),
        ctx.productKeywords,
        ctx.negativeTags,
        ctx.seasonContext,
        ctx.topicId,
        ctx.slug,
      );
      for (const anchor of anchors) {
        const a = anchor.toLowerCase();
        if (a.length >= 4 && altBlob.includes(a)) {
          textScore += 5;
          break;
        }
      }
      return {
        ...candidate,
        textScore,
      };
    })
    .filter((c) => c.textScore >= TEXT_MIN_SCORE)
    .sort((a, b) => b.textScore - a.textScore);
}

async function fetchPexelsCandidates(query, apiKey, slug, queryIndex, ctx, pageOffset) {
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex, pageOffset)));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) throw new Error(`Pexels API ${response.status}`);

  const data = await response.json();
  return (data.photos ?? [])
    .map((photo) => {
      const imageUrl = photo.src?.large2x || photo.src?.large;
      if (!imageUrl) return null;
      return {
        imageUrl,
        thumbUrl: photo.src?.medium || photo.src?.small || imageUrl,
        assetKey: assetKey("pexels", photo.id),
        providerAlt: photo.alt ?? "",
        relevanceText: photo.alt ?? "",
        credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
        provider: "pexels",
        assetId: photo.id,
        searchQuery: query,
      };
    })
    .filter(Boolean);
}

async function fetchPexelsPhotoById(photoId, apiKey, query = "curated") {
  const response = await fetch(`${PEXELS_PHOTO}/${photoId}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) throw new Error(`Pexels photo ${photoId}: ${response.status}`);

  const photo = await response.json();
  const imageUrl = photo.src?.large2x || photo.src?.large;
  if (!imageUrl) throw new Error(`Pexels photo ${photoId}: no image URL`);

  return {
    imageUrl,
    thumbUrl: photo.src?.medium || photo.src?.small || imageUrl,
    assetKey: assetKey("pexels", photo.id),
    providerAlt: photo.alt ?? "",
    relevanceText: photo.alt ?? "",
    credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
    provider: "pexels",
    assetId: photo.id,
    searchQuery: query,
  };
}

async function fetchCuratedCandidates(slug) {
  const curated = CURATED_SLUG_ASSETS[slug] ?? [];
  if (curated.length === 0) return [];

  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return [];

  const out = [];
  for (const entry of curated) {
    if (entry.provider !== "pexels") continue;
    try {
      const candidate = await fetchPexelsPhotoById(entry.assetId, apiKey, entry.query ?? "curated");
      if (!isBlockedAsset(candidate, { topicId: slug.includes("cordless-vacuum") ? "cordless-vacuums" : undefined, slug })) out.push(candidate);
    } catch (error) {
      console.warn(`Curated pexels:${entry.assetId} failed: ${error.message}`);
    }
  }
  return out;
}

async function fetchPixabayCandidates(query, apiKey, slug, queryIndex, ctx, pageOffset) {
  const url = new URL(PIXABAY_SEARCH);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex, pageOffset)));
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pixabay API ${response.status}`);

  const data = await response.json();
  return (data.hits ?? [])
    .map((hit) => {
      const imageUrl = hit.largeImageURL || hit.webformatURL;
      if (!imageUrl) return null;
      return {
        imageUrl,
        thumbUrl: hit.previewURL || imageUrl,
        assetKey: assetKey("pixabay", hit.id),
        providerAlt: hit.tags ?? "",
        relevanceText: hit.tags ?? "",
        credit: `Photo by ${hit.user ?? "Pixabay"} / Pixabay`,
        provider: "pixabay",
        assetId: hit.id,
        searchQuery: query,
      };
    })
    .filter(Boolean);
}

async function fetchUnsplashCandidates(query, apiKey, slug, queryIndex, ctx, pageOffset) {
  const url = new URL(UNSPLASH_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex, pageOffset)));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${apiKey}`,
      "Accept-Version": "v1",
    },
  });
  if (!response.ok) throw new Error(`Unsplash API ${response.status}`);

  const data = await response.json();
  return (data.results ?? [])
    .map((photo) => {
      const imageUrl = photo.urls?.regular || photo.urls?.full || photo.urls?.small;
      if (!imageUrl) return null;
      const tagBlob = (photo.tags ?? [])
        .map((t) => t?.title)
        .filter(Boolean)
        .join(", ");
      const alt = [photo.alt_description, photo.description, tagBlob]
        .filter(Boolean)
        .join(" | ");
      const photographer = photo.user?.name ?? "Unsplash";
      return {
        imageUrl,
        thumbUrl: photo.urls?.small || imageUrl,
        assetKey: assetKey("unsplash", photo.id),
        providerAlt: alt,
        relevanceText: alt,
        credit: `Photo by ${photographer} / Unsplash`,
        provider: "unsplash",
        assetId: photo.id,
        searchQuery: query,
        downloadLocation: photo.links?.download_location ?? null,
      };
    })
    .filter(Boolean);
}

function pingUnsplashDownload(downloadLocation, apiKey) {
  if (!downloadLocation || !apiKey) return;
  fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  }).catch(() => {});
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    if (seen.has(c.assetKey)) continue;
    seen.add(c.assetKey);
    out.push(c);
  }
  return out;
}

/**
 * Search both providers across queries; return text-ranked unused pool.
 */
async function collectCandidatePool(slug, ctx, registry, options) {
  const providers = allProviders(options.provider);
  const pageOffsets = options.forceRefresh
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
    : [0, 1, 2, 3];

  const raw = [];

  if (!options.skipCurated) {
    raw.push(...(await fetchCuratedCandidates(slug)));
  }

  let lastError = null;

  for (let queryIndex = 0; queryIndex < ctx.searchQueries.length; queryIndex++) {
    const query = ctx.searchQueries[queryIndex];
    for (const pageOffset of pageOffsets) {
      for (const provider of providers) {
        try {
          let batch = [];
          if (provider === "pexels" && process.env.PEXELS_API_KEY?.trim()) {
            batch = await fetchPexelsCandidates(
              query,
              process.env.PEXELS_API_KEY.trim(),
              slug,
              queryIndex,
              ctx,
              pageOffset,
            );
          } else if (provider === "pixabay" && process.env.PIXABAY_API_KEY?.trim()) {
            batch = await fetchPixabayCandidates(
              query,
              process.env.PIXABAY_API_KEY.trim(),
              slug,
              queryIndex,
              ctx,
              pageOffset,
            );
          } else if (provider === "unsplash" && unsplashAccessKey()) {
            batch = await fetchUnsplashCandidates(
              query,
              unsplashAccessKey(),
              slug,
              queryIndex,
              ctx,
              pageOffset,
            );
          }
          raw.push(...batch);
        } catch (error) {
          lastError = error;
          console.warn(`${provider} search failed for "${query}": ${error.message}`);
        }
      }
    }
  }

  const deduped = dedupeCandidates(raw);
  const sample = deduped.slice(0, 5).map((c) => `${c.provider}:${String(c.providerAlt ?? "").slice(0, 80)}`);
  console.log(`  sample alts: ${sample.join(" || ")}`);
  const ranked = rankText(deduped, ctx);
  const unused = filterBlocked(ranked, ctx).filter((c) => !candidateIsUsed(registry, c));
  console.log(
    `  pool sizes: raw=${raw.length} ranked=${ranked.length} unused=${unused.length}`,
  );

  return { pool: unused, lastError };
}

async function pickWinnerFromPool(pool, ctx, registry, slug, options) {
  if (pool.length === 0) return null;

  // Default: rank by provider alt/tags from Pexels / Pixabay / Unsplash.
  // OpenAI vision is opt-in only (IMAGE_VISION=1) — not used for image picking.
  if (visionSelectionEnabled()) {
    const visionRanked = await rankCandidatesWithVision(pool, ctx);
    let winner = pickVisionWinner(visionRanked);

    if (!winner) {
      console.warn(`Vision rejected pool for ${slug} — expanding search`);
      const { pool: widerPool } = await collectCandidatePool(slug, ctx, registry, {
        ...options,
        forceRefresh: false,
        provider: undefined,
        skipCurated: true,
      });
      const extra = widerPool.filter((c) => !pool.some((p) => p.assetKey === c.assetKey));
      if (extra.length > 0) {
        const extraRanked = await rankCandidatesWithVision(
          [...pool.slice(0, 6), ...extra].slice(0, 14),
          ctx,
        );
        winner = pickVisionWinner(extraRanked);
      }
    }
    return winner;
  }

  const vacuumMode = vacuumTopicMode(ctx.topicId, ctx.slug);
  const speakerMode = isPortableSpeakerTopic(ctx.topicId, ctx.slug);
  const minText = vacuumMode
    ? VACUUM_TEXT_MIN_SCORE
    : speakerMode
      ? SPEAKER_TEXT_MIN_SCORE
      : DEFAULT_TEXT_MIN_SCORE;
  const strongText = pool.filter((c) => c.textScore >= minText);
  const winner = strongText[0] ?? null;
  if (winner) {
    console.log(
      `  stock pick: ${winner.provider}:${winner.assetId} (score ${winner.textScore})`,
    );
  } else {
    console.warn(
      `  stock APIs: no candidate met min score ${minText} for ${slug} — refusing weak/off-topic pick`,
    );
  }
  return winner;
}

export function clearSlugCoverAssets(slug, coverImage, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();

  if (coverImage?.startsWith("/images/posts/")) {
    const filePath = path.join(rootDir, "public", coverImage.replace(/^\//, ""));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }

  const dir = path.join(rootDir, "public", "images", "posts", slug);
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (/\.(jpe?g|webp|png)$/i.test(name)) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {
          /* ignore */
        }
      }
    }
  }

  const registry = loadImageRegistry();
  registry.entries = registry.entries.filter((e) => e.slug !== slug);
  saveImageRegistry(registry);
}

function workRoot(options) {
  return options.rootDir ?? process.cwd();
}

/**
 * Prefer manufacturer press-kit / newsroom product cuts when brand+model
 * can be resolved from title or explicit model. Falls back to null so
 * callers continue with Pexels/Pixabay stock.
 */
export async function tryOfficialCoverFirst(slug, queryOrContext, options = {}) {
  const meta =
    typeof queryOrContext === "string" ? { imageQuery: queryOrContext } : (queryOrContext ?? {});
  const title = String(meta.title ?? "");
  const models = [
    ...(meta.modelPick?.primary
      ? [
          {
            id: meta.modelPick.primary.id,
            brand: meta.modelPick.primary.brand,
            name: meta.modelPick.primary.name,
            nameKo: meta.modelPick.primary.nameKo,
          },
        ]
      : []),
    ...parseModelsFromTitle(title),
  ];

  // Deduplicate by id
  const seen = new Set();
  const unique = [];
  for (const m of models) {
    if (!m?.brand || !m?.name) continue;
    const key = (m.id || `${m.brand}-${m.name}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
  }

  for (const model of unique.slice(0, 3)) {
    try {
      const press = await fetchPressKitImages(slug, model, {
        count: 1,
        preferRoles: ["cover", "lifestyle", "detail"],
        rootDir: options.rootDir,
      });
      const cover = press.images?.[0];
      if (!cover?.path) continue;

      console.log(`Cover from official press kit: ${cover.path} (${model.brand} ${model.name})`);
      return {
        coverImage: cover.path,
        coverImageAlt: cover.altEn,
        coverImageAltKo: cover.altKo,
        coverImageCredit: cover.credit,
        coverImageProvider: "press-kit",
        coverImageAssetId: cover.assetId,
        coverImageSourceUrl: cover.sourceUrl,
        imageSearchKeywords: meta.imageSearchKeywords,
      };
    } catch (err) {
      console.warn(`Official cover try failed (${model.brand} ${model.name}): ${err.message}`);
    }
  }
  return null;
}

/**
 * Fetch a cover image: official press-kit first, then Pexels / Pixabay / Unsplash.
 * Ranking uses each provider's alt/tags — not OpenAI vision.
 */
export async function fetchCoverImage(slug, queryOrContext, options = {}) {
  if (!options.skipOfficial) {
    const official = await tryOfficialCoverFirst(slug, queryOrContext, options);
    if (official) return official;
  }

  const ctx = resolveImageContext(slug, queryOrContext);
  const rootDir = workRoot(options);
  let registry = syncImageRegistryFromPosts();

  const providers = allProviders(options.provider);
  if (providers.length === 0) {
    console.warn(
      "No image API keys set — add PEXELS_API_KEY, PIXABAY_API_KEY, and/or UNSPLASH_ACCESS_KEY",
    );
    return null;
  }

  if (options.forceRefresh) {
    const meta =
      typeof queryOrContext === "object" && queryOrContext?.coverImage
        ? queryOrContext.coverImage
        : null;
    clearSlugCoverAssets(slug, meta, options);
    registry = syncImageRegistryFromPosts();
  }

  const filename = buildCoverFilename(ctx.productKeywords, slug);
  const alts = buildCoverAlts(ctx);
  const coverImageAlt = alts.en;
  const coverImageAltKo = alts.ko;

  console.log(`Image search: ${slug}`);
  console.log(`  keywords: ${ctx.productKeywords.join(" | ")}`);
  console.log(`  alt anchors required: ${(ctx.requiredAnchors ?? []).join(", ") || "none"}`);
  console.log(`  queries: ${ctx.searchQueries.slice(0, 4).join(" | ")}`);
  if (ctx.seasonContext?.season) {
    console.log(`  season: ${ctx.seasonContext.season} (scene rejects: ${ctx.seasonContext.sceneReject.slice(0, 4).join(", ")})`);
  }
  console.log(`  stock APIs: ${providers.join(", ")}`);

  const { pool, lastError } = await collectCandidatePool(slug, ctx, registry, options);

  if (pool.length === 0) {
    console.warn(`No viable candidates for ${slug}`);
    if (lastError) console.warn(lastError.message);
    return null;
  }

  console.log(`  text-ranked pool: ${pool.length} unused candidate(s)`);

  const winner = await pickWinnerFromPool(pool, ctx, registry, slug, options);

  if (!winner) {
    console.warn(`No stock API image met the relevance bar for ${slug}`);
    if (lastError) console.warn(lastError.message);
    return null;
  }

  const winnerAlt = winner.providerAlt ?? winner.relevanceText ?? "";
  if (!passesVacuumTypeAltGate(winnerAlt, ctx.topicId, ctx.slug)) {
    console.warn(
      `Winner failed vacuum-type alt gate (${winner.provider}:${winner.assetId}) — aborting ${slug}`,
    );
    return null;
  }

  if (winner.visionScore != null) {
    console.log(
      `  vision pick: ${winner.provider}:${winner.assetId} vision=${winner.visionScore}/10 text=${winner.textScore}`,
    );
  }

  try {
    const downloaded = await downloadToSlug(slug, winner.imageUrl, filename, rootDir);
    if (winner.provider === "unsplash") {
      pingUnsplashDownload(winner.downloadLocation, unsplashAccessKey());
    }

    if (visionSelectionEnabled()) {
      const verify = await verifyDownloadedImage(downloaded.buffer, ctx);
      console.log(
        `  post-download verify: ${verify.score}/10 (${verify.reason})`,
      );
      if (
        verify.score < visionMinScore() ||
        visionReasonRejected(verify.reason)
      ) {
        console.warn(`Post-download vision rejected ${slug} — discarding file`);
        fs.unlinkSync(
          path.join(rootDir, "public", downloaded.relativePath.replace(/^\//, "")),
        );
        return null;
      }
    }

    if (
      isImageUsed(registry, {
        hash: downloaded.hash,
        contentHash: hashImageContent(downloaded.buffer),
      })
    ) {
      console.warn(`Downloaded image already used (file or visual content) — aborting ${slug}`);
      fs.unlinkSync(
        path.join(rootDir, "public", downloaded.relativePath.replace(/^\//, "")),
      );
      return null;
    }

    registerUsedImage(registry, {
      slug,
      url: winner.imageUrl,
      assetKey: winner.assetKey,
      hash: downloaded.hash,
      contentHash: hashImageContent(downloaded.buffer),
      provider: winner.provider,
    });
    saveImageRegistry(registry);

    console.log(
      `Cover image: ${slug} via ${winner.provider} id=${winner.assetId} query="${winner.searchQuery}"`,
    );

    return {
      coverImage: downloaded.relativePath,
      coverImageAlt,
      coverImageAltKo,
      coverImageCredit: winner.credit,
      coverImageProvider: winner.provider,
      coverImageAssetId: winner.assetId,
      coverImageSourceUrl: winner.imageUrl,
      imageSearchKeywords: ctx.imageSearchKeywords,
    };
  } catch (error) {
    console.warn(`Download failed for ${slug}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch additional in-body stock images (same Pexels/Pixabay pipeline).
 * Used by model-deep-dive for 1–2 product-cut / lifestyle figures.
 *
 * @param {string} slug
 * @param {string | Record<string, unknown>} queryOrContext
 * @param {{ count?: number, filenamePrefix?: string, rootDir?: string, provider?: string, skipCurated?: boolean }} [options]
 * @returns {Promise<Array<{ path: string, credit: string, provider: string, assetId: string|number, sourceUrl: string, searchQuery: string }>>}
 */
export async function fetchAdditionalImages(slug, queryOrContext, options = {}) {
  const count = Math.max(1, Math.min(3, options.count ?? 2));
  const prefix = options.filenamePrefix ?? "body";
  const ctx = resolveImageContext(slug, queryOrContext);
  const rootDir = workRoot(options);
  let registry = syncImageRegistryFromPosts();

  const providers = allProviders(options.provider);
  if (providers.length === 0) {
    console.warn("No image API keys — skip additional body images");
    return [];
  }

  const { pool } = await collectCandidatePool(slug, ctx, registry, {
    ...options,
    skipCurated: options.skipCurated ?? true,
  });

  if (pool.length === 0) {
    console.warn(`No body-image candidates for ${slug}`);
    return [];
  }

  const results = [];
  const usedKeys = new Set();

  for (let i = 0; i < count; i++) {
    const remaining = pool.filter((c) => !usedKeys.has(c.assetKey));
    if (remaining.length === 0) break;

    const winner = await pickWinnerFromPool(remaining, ctx, registry, `${slug}-body-${i}`, {
      ...options,
      skipCurated: true,
    });
    if (!winner) break;
    usedKeys.add(winner.assetKey);

    const filename = `${prefix}-${i + 1}-${hashSlug(slug, `body:${i}`).toString(16).slice(0, 6)}.jpg`;
    try {
      const downloaded = await downloadToSlug(slug, winner.imageUrl, filename, rootDir);
      if (
        isImageUsed(registry, {
          hash: downloaded.hash,
          contentHash: hashImageContent(downloaded.buffer),
        })
      ) {
        fs.unlinkSync(
          path.join(rootDir, "public", downloaded.relativePath.replace(/^\//, "")),
        );
        continue;
      }

      registerUsedImage(registry, {
        slug,
        url: winner.imageUrl,
        assetKey: winner.assetKey,
        hash: downloaded.hash,
        contentHash: hashImageContent(downloaded.buffer),
        provider: winner.provider,
      });
      saveImageRegistry(registry);
      registry = loadImageRegistry();

      console.log(
        `Body image ${i + 1}: ${slug} via ${winner.provider} id=${winner.assetId}`,
      );

      results.push({
        path: downloaded.relativePath,
        credit: winner.credit,
        provider: winner.provider,
        assetId: winner.assetId,
        sourceUrl: winner.imageUrl,
        searchQuery: winner.searchQuery,
      });
    } catch (error) {
      console.warn(`Body image download failed: ${error.message}`);
    }
  }

  return results;
}
