import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  try {
    const post = getPostBySlug(slug);
    const url = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;

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
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.description,
      },
      alternates: {
        canonical: url,
        languages: Object.fromEntries(
          locales.map((l) => [
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
  const dict = await getDictionary(locale);

  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  return <ArticleLayout post={post} locale={locale} dict={dict} />;
}
