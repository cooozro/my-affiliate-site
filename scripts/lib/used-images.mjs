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

export function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return hashBuffer(fs.readFileSync(filePath));
}

function registrySets(registry) {
  const urls = new Set();
  const assets = new Set();
  const hashes = new Set();

  for (const entry of registry.entries) {
    if (entry.url) urls.add(normalizeUrl(entry.url));
    if (entry.assetKey) assets.add(entry.assetKey);
    if (entry.hash) hashes.add(entry.hash);
  }

  return { urls, assets, hashes };
}

/**
 * @param {ReturnType<typeof loadImageRegistry>} registry
 * @param {{ url?: string, assetKey?: string, hash?: string }} candidate
 */
export function isImageUsed(registry, candidate) {
  const { urls, assets, hashes } = registrySets(registry);

  if (candidate.assetKey && assets.has(candidate.assetKey)) return true;
  if (candidate.url && urls.has(normalizeUrl(candidate.url))) return true;
  if (candidate.hash && hashes.has(candidate.hash)) return true;

  return false;
}

export function registerUsedImage(registry, entry) {
  const next = {
    slug: entry.slug,
    url: entry.url ? normalizeUrl(entry.url) : undefined,
    assetKey: entry.assetKey ?? null,
    hash: entry.hash ?? null,
    provider: entry.provider ?? null,
    registeredAt: entry.registeredAt ?? new Date().toISOString(),
  };

  const duplicate = registry.entries.some(
    (e) =>
      (next.assetKey && e.assetKey === next.assetKey) ||
      (next.hash && e.hash === next.hash) ||
      (next.url && e.url === next.url),
  );

  if (!duplicate) {
    registry.entries.push(next);
  }

  return registry;
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
    const assetKeyValue =
      data.coverImageProvider && data.coverImageAssetId
        ? assetKey(data.coverImageProvider, data.coverImageAssetId)
        : null;

    registerUsedImage(registry, {
      slug,
      url: data.coverImageSourceUrl,
      assetKey: assetKeyValue,
      hash,
      provider: data.coverImageProvider,
    });
  }

  saveImageRegistry(registry);
  return registry;
}
