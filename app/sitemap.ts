import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

const staticPages = ["", "/about", "/contact", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${siteConfig.url}${localizedPath(locale, page)}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "daily" : "monthly",
      priority: page === "" ? 1 : 0.6,
    })),
  );

  const postEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    posts.map((post) => ({
      url: `${siteConfig.url}${localizedPath(locale, `/blog/${post.slug}`)}`,
      lastModified: post.updatedAt ?? post.date,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  return [...staticEntries, ...postEntries];
}
