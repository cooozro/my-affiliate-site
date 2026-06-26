import "server-only";

import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import { getAllPosts, type PostMeta } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString();
  }
  return date.toUTCString();
}

function buildItem(post: PostMeta, locale: Locale): string {
  const postUrl = `${siteConfig.url}${localizedPath(locale, `/blog/${post.slug}`)}`;
  const pubDate = toRfc822(post.updatedAt ?? post.date);
  const description = escapeXml(post.description);
  const title = escapeXml(post.title);

  let enclosure = "";
  if (post.coverImage) {
    const imageUrl = post.coverImage.startsWith("http")
      ? post.coverImage
      : `${siteConfig.url}${post.coverImage}`;
    enclosure = `\n      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" />`;
  }

  const categories = (post.tags ?? [])
    .map((tag) => `      <category>${escapeXml(tag)}</category>`)
    .join("\n");

  return `    <item>
      <title>${title}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>${categories ? `\n${categories}` : ""}${enclosure}
    </item>`;
}

export function buildRssFeed(
  locale: Locale,
  channelDescription: string,
): string {
  const posts = getAllPosts(locale);
  const channelLink = `${siteConfig.url}${localizedPath(locale)}`;
  const feedUrl = `${siteConfig.url}/${locale}/feed.xml`;
  const language = locale === "ko" ? "ko-KR" : "en-US";
  const lastBuildDate =
    posts.length > 0
      ? toRfc822(posts[0].updatedAt ?? posts[0].date)
      : new Date().toUTCString();

  const items = posts.map((post) => buildItem(post, locale)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
