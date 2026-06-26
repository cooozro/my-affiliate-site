import "server-only";

import type { Locale } from "@/lib/i18n/config";
import { buildFeedItemHtml, buildFeedPlainSummary } from "@/lib/feed-excerpt";
import { localizedPath } from "@/lib/i18n/paths";
import { getPostBySlug, getAllPosts, type PostMeta } from "@/lib/posts";
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
  const title = escapeXml(post.title);

  let description = escapeXml(post.description);
  let contentEncoded = "";

  try {
    const full = getPostBySlug(post.slug, { locale });
    const plainSummary = buildFeedPlainSummary(
      full.content,
      locale,
      post.description,
    );
    description = escapeXml(plainSummary);
    contentEncoded = buildFeedItemHtml(full.content, locale, post.description);
  } catch {
    contentEncoded = `<p>${description}</p>`;
  }

  let enclosure = "";
  let mediaContent = "";
  if (post.coverImage) {
    const imageUrl = post.coverImage.startsWith("http")
      ? post.coverImage
      : `${siteConfig.url}${post.coverImage}`;
    enclosure = `\n      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />`;
    mediaContent = `\n      <media:content url="${escapeXml(imageUrl)}" medium="image" />`;
  }

  const categories = (post.tags ?? [])
    .map((tag) => `      <category>${escapeXml(tag)}</category>`)
    .join("\n");

  const contentBlock = contentEncoded
    ? `\n      <content:encoded><![CDATA[${contentEncoded}]]></content:encoded>`
    : "";

  return `    <item>
      <title>${title}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(siteConfig.author)}</dc:creator>
      <description>${description}</description>${contentBlock}${categories ? `\n${categories}` : ""}${enclosure}${mediaContent}
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

  const channelImage = posts[0]?.coverImage
    ? posts[0].coverImage.startsWith("http")
      ? posts[0].coverImage
      : `${siteConfig.url}${posts[0].coverImage}`
    : null;
  const imageBlock = channelImage
    ? `    <image>
      <url>${escapeXml(channelImage)}</url>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>`
    : "";

  const items = posts.slice(0, 30).map((post) => buildItem(post, locale)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${language}</language>
    <copyright>© ${new Date().getFullYear()} ${escapeXml(siteConfig.name)}</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
${imageBlock ? `${imageBlock}\n` : ""}    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
