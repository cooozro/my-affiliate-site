import { notFound, redirect } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { getAdminSessionFromCookies, isAdminConfigured } from "@/lib/admin-auth";
import { enrichPost } from "@/lib/enrich-post";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { getPostBySlug } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
};

export default async function AdminPreviewPage({
  params,
  searchParams,
}: PageProps) {
  if (!isAdminConfigured()) {
    redirect("/admin/login");
  }

  const hasSession = await getAdminSessionFromCookies();
  if (!hasSession) {
    redirect("/admin/login");
  }

  const { slug } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = (localeParam && isValidLocale(localeParam)
    ? localeParam
    : "en") as Locale;

  let post;
  try {
    post = await enrichPost(
      getPostBySlug(slug, { locale, includeDrafts: true }),
      locale,
    );
  } catch {
    notFound();
  }

  const dict = await getDictionary(locale);
  const shareUrl = `${siteConfig.url}${localizedPath(locale, `/blog/${slug}`)}`;

  return (
    <div>
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200">
        Admin preview — {post.draft ? "draft" : "published"}
      </div>
      <ArticleLayout
        post={post}
        locale={locale}
        shareUrl={shareUrl}
        shareLabels={dict.blog.share}
      />
    </div>
  );
}
