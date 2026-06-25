import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { enrichPost } from "@/lib/enrich-post";
import { getAllStaticBlogParams, getPostBySlug, getPostSlugs } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllStaticBlogParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  try {
    const post = getPostBySlug(slug, { locale });
    const url = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;
    const ogImage = post.coverImage
      ? `${siteConfig.url}${post.coverImage}`
      : undefined;

    return {
      title: post.title,
      description: post.description,
      openGraph: {
        type: "article",
        title: post.title,
        description: post.description,
        url,
        locale: ogLocales[locale],
        publishedTime: post.date,
        modifiedTime: post.updatedAt ?? post.date,
        tags: post.tags,
        authors: [siteConfig.author],
        ...(ogImage ? { images: [{ url: ogImage, alt: post.coverImageAlt }] } : {}),
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title: post.title,
        description: post.description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      alternates: {
        canonical: url,
        languages: Object.fromEntries(
          locales
            .filter((l) => getPostSlugs(l).includes(slug))
            .map((l) => [
              l,
              `${siteConfig.url}${localizedPath(l, `/blog/${slug}`)}`,
            ]),
        ),
      },
    };
  } catch {
    return { title: dict.blog.notFound };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;

  let post;
  try {
    post = await enrichPost(getPostBySlug(slug, { locale }), locale);
  } catch {
    notFound();
  }

  return <ArticleLayout post={post} locale={locale} />;
}
