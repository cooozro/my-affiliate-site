import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { JsonLd } from "@/components/json-ld";
import {
  buildBlogPostMetadata,
  buildBlogPostPageJsonLd,
} from "@/lib/guardian";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { enrichPost } from "@/lib/enrich-post";
import { getAllStaticBlogParams, getPostBySlug } from "@/lib/posts";
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
    return buildBlogPostMetadata({ locale, slug, post });
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

  const dict = await getDictionary(locale);
  const pageUrl = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;

  const jsonLd = buildBlogPostPageJsonLd({
    locale,
    slug,
    post,
    pageUrl,
    breadcrumbLabels: {
      home: dict.nav.home,
      articles: dict.home.latestPosts,
    },
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticleLayout
        post={post}
        locale={locale}
        shareUrl={pageUrl}
        shareLabels={dict.blog.share}
        dateLabels={{
          published: dict.blog.published,
          updated: dict.blog.updated,
        }}
      />
    </>
  );
}
