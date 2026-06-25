import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = getPostBySlug(slug);
    const url = `${siteConfig.url}/blog/${slug}`;

    return {
      title: post.title,
      description: post.description,
      openGraph: {
        type: "article",
        title: post.title,
        description: post.description,
        url,
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
      },
    };
  } catch {
    return { title: "글을 찾을 수 없습니다" };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  return <ArticleLayout post={post} />;
}
