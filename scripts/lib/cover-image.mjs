import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  buildCoverAlt,
  buildCoverFilename,
  resolveImageContext,
  scoreImageRelevance,
} from "./image-query.mjs";
import {
  pickVisionWinner,
  rankCandidatesWithVision,
  visionMinScore,
  visionSelectionEnabled,
} from "./image-vision.mjs";
import {
  assetKey,
  hashBuffer,
  isImageUsed,
  loadImageRegistry,
  registerUsedImage,
  saveImageRegistry,
  syncImageRegistryFromPosts,
} from "./used-images.mjs";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const PIXABAY_SEARCH = "https://pixabay.com/api/";

const TEXT_MIN_SCORE = 2;

/** Stable numeric hash from slug (provider pick + result offset). */
export function hashSlug(slug, salt = "") {
  const hex = crypto.createHash("sha256").update(`${slug}:${salt}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16);
}

export function availableImageProviders() {
  const providers = [];
  if (process.env.PEXELS_API_KEY?.trim()) providers.push("pexels");
  if (process.env.PIXABAY_API_KEY?.trim()) providers.push("pixabay");
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

async function downloadToSlug(slug, imageUrl, filename) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const relativePath = `/images/posts/${slug}/${filename}`;
  const destPath = path.join(process.cwd(), "public", "images", "posts", slug, filename);
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

function rankText(candidates, ctx) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      textScore: scoreImageRelevance(
        candidate.relevanceText,
        ctx.productKeywords,
        ctx.negativeTags,
      ),
    }))
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
        relevanceText: `${photo.alt ?? ""} ${query}`,
        credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
        provider: "pexels",
        assetId: photo.id,
        searchQuery: query,
      };
    })
    .filter(Boolean);
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
        relevanceText: `${hit.tags ?? ""} ${query}`,
        credit: `Photo by ${hit.user ?? "Pixabay"} / Pixabay`,
        provider: "pixabay",
        assetId: hit.id,
        searchQuery: query,
      };
    })
    .filter(Boolean);
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
          }
          raw.push(...batch);
        } catch (error) {
          lastError = error;
          console.warn(`${provider} search failed for "${query}": ${error.message}`);
        }
      }
    }
  }

  const ranked = rankText(dedupeCandidates(raw), ctx);
  const unused = ranked.filter((c) => !candidateIsUsed(registry, c));

  return { pool: unused, lastError };
}

export function clearSlugCoverAssets(slug, coverImage) {
  if (coverImage?.startsWith("/images/posts/")) {
    const filePath = path.join(process.cwd(), "public", coverImage.replace(/^\//, ""));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }

  const dir = path.join(process.cwd(), "public", "images", "posts", slug);
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

/**
 * Fetch a cover image using Pexels + Pixabay with vision ranking when available.
 */
export async function fetchCoverImage(slug, queryOrContext, options = {}) {
  const ctx = resolveImageContext(slug, queryOrContext);
  let registry = syncImageRegistryFromPosts();

  const providers = allProviders(options.provider);
  if (providers.length === 0) {
    console.warn("No image API keys set — add PEXELS_API_KEY and/or PIXABAY_API_KEY");
    return null;
  }

  if (options.forceRefresh) {
    const meta =
      typeof queryOrContext === "object" && queryOrContext?.coverImage
        ? queryOrContext.coverImage
        : null;
    clearSlugCoverAssets(slug, meta);
    registry = syncImageRegistryFromPosts();
  }

  const filename = buildCoverFilename(ctx.productKeywords, slug);
  const coverImageAlt = buildCoverAlt("en", ctx);
  const coverImageAltKo = buildCoverAlt("ko", ctx);

  console.log(`Image search: ${slug}`);
  console.log(`  keywords: ${ctx.productKeywords.join(" | ")}`);
  console.log(`  queries: ${ctx.searchQueries.slice(0, 4).join(" | ")}`);
  console.log(
    `  vision: ${visionSelectionEnabled() ? `on (min ${visionMinScore()}/10)` : "off (text-only)"}`,
  );

  const { pool, lastError } = await collectCandidatePool(slug, ctx, registry, options);

  if (pool.length === 0) {
    console.warn(`No viable candidates for ${slug}`);
    if (lastError) console.warn(lastError.message);
    return null;
  }

  console.log(`  text-ranked pool: ${pool.length} unused candidate(s)`);

  let winner = null;

  if (visionSelectionEnabled()) {
    const visionRanked = await rankCandidatesWithVision(pool, ctx);
    winner = pickVisionWinner(visionRanked);

    if (!winner) {
      console.warn(
        `Vision rejected all candidates for ${slug} — expanding search across providers`,
      );
      const { pool: widerPool } = await collectCandidatePool(slug, ctx, registry, {
        ...options,
        forceRefresh: false,
        provider: undefined,
      });
      const extra = widerPool.filter(
        (c) => !pool.some((p) => p.assetKey === c.assetKey),
      );
      if (extra.length > 0) {
        const extraRanked = await rankCandidatesWithVision(
          [...pool.slice(0, 5), ...extra].slice(0, 12),
          ctx,
        );
        winner = pickVisionWinner(extraRanked);
      }
    }
  }

  if (!winner) {
    const strongText = pool.filter((c) => c.textScore >= 6);
    if (strongText.length > 0) {
      winner = strongText[0];
      console.log(
        `  text fallback: ${winner.provider}:${winner.assetId} (score ${winner.textScore})`,
      );
    }
  }

  if (!winner) {
    if (!visionSelectionEnabled() && pool.length > 0) {
      winner = pool[0];
      console.log(
        `  text-only pick: ${winner.provider}:${winner.assetId} (score ${winner.textScore})`,
      );
    } else {
      console.warn(`No suitable image for ${slug}`);
      if (lastError) console.warn(lastError.message);
      return null;
    }
  } else if (winner.visionScore != null) {
    console.log(
      `  vision pick: ${winner.provider}:${winner.assetId} vision=${winner.visionScore}/10 text=${winner.textScore}`,
    );
  }

  try {
    const downloaded = await downloadToSlug(slug, winner.imageUrl, filename);

    if (isImageUsed(registry, { hash: downloaded.hash })) {
      console.warn(`Downloaded hash already used — aborting ${slug}`);
      fs.unlinkSync(
        path.join(process.cwd(), "public", downloaded.relativePath.replace(/^\//, "")),
      );
      return null;
    }

    registerUsedImage(registry, {
      slug,
      url: winner.imageUrl,
      assetKey: winner.assetKey,
      hash: downloaded.hash,
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
