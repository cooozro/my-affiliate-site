import crypto from "crypto";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const REGISTRY_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "used-cover-images.json",
);

function emptyRegistry() {
  return { version: 1, entries: [] };
}

export function loadImageRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return emptyRegistry();
  }

  try {
    const data = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    return { ...emptyRegistry(), ...data, entries: data.entries ?? [] };
  } catch {
    return emptyRegistry();
  }
}

export function saveImageRegistry(registry) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function normalizeUrl(url) {
  return String(url ?? "")
    .trim()
    .split("?")[0]
    .toLowerCase();
}

export function assetKey(provider, assetId) {
  if (!provider || assetId == null) return null;
  return `${provider}:${String(assetId)}`;
}

export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * JPEG/WEBP hero dedup: hash pixel bytes only (trim junk appended after EOI).
 * Stops "copy file + HTML comment" from bypassing duplicate-hero checks.
 */
export function normalizeImageBufferForDedup(buffer) {
  if (!buffer?.length) return buffer;

  // JPEG: end at last FF D9 (EOI)
  for (let i = buffer.length - 2; i >= 0; i -= 1) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
      return buffer.subarray(0, i + 2);
    }
  }

  // WEBP: use RIFF container minus optional trailing append
  if (
    buffer.length > 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    const size = buffer.readUInt32LE(4) + 8;
    if (size > 0 && size <= buffer.length) {
      return buffer.subarray(0, size);
    }
  }

  return buffer;
}

export function hashImageContent(buffer) {
  return hashBuffer(normalizeImageBufferForDedup(buffer));
}

export function hashImageContentFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return hashImageContent(fs.readFileSync(filePath));
}

export function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return hashBuffer(fs.readFileSync(filePath));
}

function registrySets(registry) {
  const urls = new Set();
  const assets = new Set();
  const hashes = new Set();
  const contentHashes = new Set();

  for (const entry of registry.entries) {
    if (entry.url) urls.add(normalizeUrl(entry.url));
    if (entry.assetKey) assets.add(entry.assetKey);
    if (entry.hash) hashes.add(entry.hash);
    if (entry.contentHash) contentHashes.add(entry.contentHash);
  }

  return { urls, assets, hashes, contentHashes };
}

/**
 * @param {ReturnType<typeof loadImageRegistry>} registry
 * @param {{ url?: string, assetKey?: string, hash?: string, contentHash?: string }} candidate
 */
export function isImageUsed(registry, candidate) {
  const { urls, assets, hashes, contentHashes } = registrySets(registry);

  if (candidate.assetKey && assets.has(candidate.assetKey)) return true;
  if (candidate.url && urls.has(normalizeUrl(candidate.url))) return true;
  if (candidate.hash && hashes.has(candidate.hash)) return true;
  if (candidate.contentHash && contentHashes.has(candidate.contentHash)) return true;
  if (candidate.hash && contentHashes.has(candidate.hash)) return true;
  if (candidate.contentHash && hashes.has(candidate.contentHash)) return true;

  return false;
}

export function registerUsedImage(registry, entry) {
  const next = {
    slug: entry.slug,
    url: entry.url ? normalizeUrl(entry.url) : undefined,
    assetKey: entry.assetKey ?? null,
    hash: entry.hash ?? null,
    contentHash: entry.contentHash ?? null,
    provider: entry.provider ?? null,
    registeredAt: entry.registeredAt ?? new Date().toISOString(),
  };

  const duplicate = registry.entries.some(
    (e) =>
      (next.assetKey && e.assetKey === next.assetKey) ||
      (next.hash && e.hash === next.hash) ||
      (next.contentHash && e.contentHash === next.contentHash) ||
      (next.url && e.url === next.url),
  );

  if (!duplicate) {
    registry.entries.push(next);
  }

  return registry;
}

/** Slugs sharing the same visual cover (content hash), including copy-paste bypasses. */
export function findDuplicateContentHashSlugs(rootDir = process.cwd()) {
  const postsDir = path.join(rootDir, "content", "posts");
  if (!fs.existsSync(postsDir)) return [];

  const byContent = new Map();

  for (const slug of fs.readdirSync(postsDir)) {
    const enPath = path.join(postsDir, slug, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (!data.coverImage) continue;

    const filePath = path.join(
      rootDir,
      "public",
      String(data.coverImage).replace(/^\//, ""),
    );
    if (!fs.existsSync(filePath)) continue;

    const contentHash = hashImageContentFile(filePath);
    if (!contentHash) continue;

    const list = byContent.get(contentHash) ?? [];
    list.push(slug);
    byContent.set(contentHash, list);
  }

  const duplicates = [];
  for (const slugs of byContent.values()) {
    if (slugs.length > 1) duplicates.push(...slugs);
  }

  return [...new Set(duplicates)].sort();
}

/**
 * Seed registry from existing post frontmatter + on-disk cover files.
 */
export function syncImageRegistryFromPosts() {
  const registry = loadImageRegistry();
  const postsDir = path.join(process.cwd(), "content", "posts");
  if (!fs.existsSync(postsDir)) return registry;

  for (const slug of fs.readdirSync(postsDir)) {
    const enPath = path.join(postsDir, slug, "en.md");
    if (!fs.existsSync(enPath)) continue;

    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    const coverPath = data.coverImage
      ? path.join(process.cwd(), "public", String(data.coverImage).replace(/^\//, ""))
      : null;

    const hash = coverPath && fs.existsSync(coverPath) ? hashFile(coverPath) : null;
    const contentHash =
      coverPath && fs.existsSync(coverPath) ? hashImageContentFile(coverPath) : null;
    const assetKeyValue =
      data.coverImageProvider && data.coverImageAssetId
        ? assetKey(data.coverImageProvider, data.coverImageAssetId)
        : null;

    registerUsedImage(registry, {
      slug,
      url: data.coverImageSourceUrl,
      assetKey: assetKeyValue,
      hash,
      contentHash,
      provider: data.coverImageProvider,
    });
  }

  saveImageRegistry(registry);
  return registry;
}
