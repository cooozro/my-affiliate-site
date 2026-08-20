/**
 * Draft/publish image integrity — cover + in-body /images/posts/ must exist on disk.
 * Prevents frontmatter/img refs that 404 in preview or on Vercel.
 */
import fs from "fs";
import path from "path";

const MIN_BYTES = 1024;

export function publicPathFromWeb(root, webPath) {
  if (typeof webPath !== "string" || !webPath.startsWith("/images/posts/")) return null;
  return path.join(root, "public", webPath.replace(/^\//, ""));
}

export function slugImageDir(root, slug) {
  return path.join(root, "public", "images", "posts", slug);
}

function isRealImageFile(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size >= MIN_BYTES;
  } catch {
    return false;
  }
}

/** First publishable image under public/images/posts/{slug}/ */
export function firstImageInSlugDir(root, slug) {
  const dir = slugImageDir(root, slug);
  if (!fs.existsSync(dir)) return null;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|webp|png)$/i.test(name)) continue;
    const abs = path.join(dir, name);
    if (isRealImageFile(abs)) return `/images/posts/${slug}/${name}`;
  }
  return null;
}

/**
 * Never copy another post's file. Same visual across posts is a hero-duplicate
 * (used-images registry). Fetch a unique stock/press asset or fail the draft.
 */
export function copyFallbackImageFromTopic() {
  return null;
}

/** Cover is rendered by the site hero — do not also embed the same file in body. */
export function stripCoverDuplicatesFromBody(body, coverWebPath) {
  const cover = typeof coverWebPath === "string" ? coverWebPath.trim() : "";
  if (!cover || !cover.startsWith("/images/posts/")) {
    return { body: String(body ?? ""), changed: false, repairs: [] };
  }
  const repairs = [];
  let next = String(body ?? "");
  const esc = cover.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const before = next;
  next = next.replace(
    new RegExp(`\\n?!\\[[^\\]]*\\]\\(${esc}\\)\\s*(?:\\n\\*[^\\n]*\\*)?\\n?`, "g"),
    "\n",
  );
  next = next.replace(
    new RegExp(`<figure>[\\s\\S]*?<img[^>]+src=["']${esc}["'][\\s\\S]*?</figure>\\n?`, "gi"),
    "",
  );
  next = next.replace(
    new RegExp(`<img[^>]+src=["']${esc}["'][^>]*\\/?>\\n?`, "gi"),
    "",
  );
  next = next.replace(/\n{3,}/g, "\n\n");
  if (next !== before) repairs.push(`removed in-body duplicate of cover ${cover}`);
  return { body: next, changed: next !== String(body ?? ""), repairs };
}

export function coverFileExists(root, slug, data) {
  const cover =
    typeof data?.coverImage === "string" ? data.coverImage.trim() : "";
  if (cover.startsWith("/images/posts/")) {
    const p = publicPathFromWeb(root, cover);
    if (isRealImageFile(p)) return true;
  }
  return Boolean(firstImageInSlugDir(root, slug));
}

export function resolveCoverWebPath(root, slug, data) {
  const cover =
    typeof data?.coverImage === "string" ? data.coverImage.trim() : "";
  if (cover.startsWith("/images/posts/")) {
    const p = publicPathFromWeb(root, cover);
    if (isRealImageFile(p)) return cover;
  }
  return firstImageInSlugDir(root, slug);
}

export function extractPostImageRefs(body) {
  const refs = new Set();
  const text = String(body ?? "");
  for (const m of text.matchAll(/!\[[^\]]*]\((\/images\/posts\/[^)]+)\)/g)) {
    refs.add(m[1]);
  }
  for (const m of text.matchAll(/<img[^>]+src=["'](\/images\/posts\/[^"']+)["']/gi)) {
    refs.add(m[1]);
  }
  return [...refs];
}

export function imageRefExists(root, webPath) {
  const p = publicPathFromWeb(root, webPath);
  return isRealImageFile(p);
}

/** Sync frontmatter coverImage to an existing slug file (repair stale paths). */
export function repairCoverFrontmatter(root, slug, data) {
  const resolved = resolveCoverWebPath(root, slug, data);
  if (!resolved) return { data, repaired: false, coverPath: null };
  const changed = String(data.coverImage ?? "").trim() !== resolved;
  return {
    data: { ...data, coverImage: resolved },
    repaired: changed,
    coverPath: resolved,
  };
}

/** Remove markdown/HTML image blocks pointing at missing local files. */
export function stripBrokenImageRefs(root, body) {
  let next = String(body ?? "");
  const repairs = [];

  for (const ref of extractPostImageRefs(next)) {
    if (imageRefExists(root, ref)) continue;
    const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = next;
    next = next.replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)[^\\n]*\\n?`, "g"), "");
    next = next.replace(
      new RegExp(`<figure>[\\s\\S]*?<img[^>]+src=["']${esc}["'][\\s\\S]*?</figure>\\n?`, "gi"),
      "",
    );
    next = next.replace(
      new RegExp(`<img[^>]+src=["']${esc}["'][^>]*\\/?>\\n?`, "gi"),
      "",
    );
    if (next !== before) repairs.push(`removed broken image ref ${ref}`);
  }

  return { body: next, changed: next !== body, repairs };
}

export function auditPostImageFiles(root, slug, body, data) {
  const errors = [];
  const cover = resolveCoverWebPath(root, slug, data);
  if (!cover) {
    errors.push(`${slug}: missing cover image file on disk`);
  } else if (!imageRefExists(root, cover)) {
    errors.push(`${slug}: cover image file missing or empty (${cover})`);
  } else if (
    typeof data?.coverImage === "string" &&
    data.coverImage.trim() &&
    data.coverImage.trim() !== cover
  ) {
    errors.push(`${slug}: coverImage frontmatter stale (${data.coverImage})`);
  }

  for (const ref of extractPostImageRefs(body)) {
    if (!imageRefExists(root, ref)) {
      errors.push(`${slug}: broken in-body image ${ref}`);
    }
  }
  return errors;
}
