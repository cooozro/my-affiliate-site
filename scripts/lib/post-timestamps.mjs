/**
 * Repair publishedAt timestamps and verify homepage sort order.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = "content/posts";
const TIMESTAMP_DRIFT_MS = 30 * 60 * 1000;

function postsRoot(root) {
  return path.join(root, POSTS_DIR);
}

function listPublishedSlugs(root) {
  const dir = postsRoot(root);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => {
      const enPath = path.join(dir, slug, "en.md");
      if (!fs.existsSync(enPath)) return false;
      const { data } = matter(fs.readFileSync(enPath, "utf8"));
      return !data.draft;
    });
}

function postSortTime(meta) {
  const iso = meta.publishedAt ?? meta.updatedAt ?? meta.date;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function readPostMeta(root, slug, locale) {
  const filePath = path.join(postsRoot(root), slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;
  const { data } = matter(fs.readFileSync(filePath, "utf8"));
  return data;
}

export function getLatestPublishFromHistory(state) {
  const publishes = (state.history ?? []).filter((entry) => entry.action === "publish");
  if (publishes.length === 0) return null;

  return [...publishes].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )[0];
}

export function listPublishedPostsBySortTime(root) {
  return listPublishedSlugs(root)
    .map((slug) => {
      const data = readPostMeta(root, slug, "en");
      if (!data) return null;
      return {
        slug,
        publishedAt: data.publishedAt,
        updatedAt: data.updatedAt,
        date: data.date,
        sortTime: postSortTime(data),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.sortTime - a.sortTime);
}

/**
 * Align frontmatter publishedAt with automation history (canonical UTC).
 */
export function repairPublishedAtFromHistory(root, state) {
  const repairs = [];
  const publishEntries = (state.history ?? []).filter(
    (entry) => entry.action === "publish" && entry.slug && entry.at,
  );
  const latestBySlug = new Map();

  for (const entry of publishEntries) {
    const prev = latestBySlug.get(entry.slug);
    if (!prev || new Date(entry.at).getTime() > new Date(prev.at).getTime()) {
      latestBySlug.set(entry.slug, entry);
    }
  }

  for (const [slug, entry] of latestBySlug) {
    const canonicalAt = entry.at;
    const canonicalMs = new Date(canonicalAt).getTime();

    for (const locale of ["en", "ko"]) {
      const filePath = path.join(postsRoot(root), slug, `${locale}.md`);
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);
      if (data.draft) continue;

      const currentMs = data.publishedAt
        ? new Date(data.publishedAt).getTime()
        : NaN;

      if (
        Number.isNaN(currentMs) ||
        Math.abs(currentMs - canonicalMs) > TIMESTAMP_DRIFT_MS
      ) {
        const previousAt = data.publishedAt ?? "missing";
        data.publishedAt = canonicalAt;
        if (!data.updatedAt || new Date(data.updatedAt).getTime() < canonicalMs) {
          data.updatedAt = canonicalAt;
        }
        fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
        repairs.push(
          `${slug}/${locale}.md: publishedAt ${previousAt} → ${canonicalAt}`,
        );
      }
    }
  }

  return repairs;
}

export function checkHomepageFeaturedOrder(root, state) {
  const sorted = listPublishedPostsBySortTime(root);
  const latest = getLatestPublishFromHistory(state);

  if (!latest || sorted.length === 0) {
    return { ok: true, featuredSlug: sorted[0]?.slug ?? null, expectedSlug: null };
  }

  const featuredSlug = sorted[0].slug;
  const expectedSlug = latest.slug;

  return {
    ok: featuredSlug === expectedSlug,
    featuredSlug,
    expectedSlug,
    featuredAt: sorted[0].publishedAt,
    expectedAt: latest.at,
  };
}
