import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { HomePostList } from "@/components/home-post-list";
import { CONTENT_SHELL } from "@/lib/layout";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { getHomePosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import en from "@/messages/en";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return {
    title: dict.home.title,
    description: dict.meta.siteDescription,
    openGraph: {
      title: siteConfig.name,
      description: dict.meta.siteDescription,
      url: `${siteConfig.url}${localizedPath(locale)}`,
      locale: ogLocales[locale],
    },
    alternates: {
      canonical: `${siteConfig.url}${localizedPath(locale)}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${siteConfig.url}${localizedPath(l)}`]),
      ),
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);
  const posts = getHomePosts(locale);

  return (
    <>
      <HomeHero description={en.meta.siteDescription} />

      <div className={`pb-12 pt-2 ${CONTENT_SHELL}`}>
        <section aria-labelledby="latest-posts-heading">
          {posts.length === 0 ? (
            <>
              <h2
                id="latest-posts-heading"
                className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {dict.home.latestPosts} (0)
              </h2>
              <p className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center font-sans text-sm text-muted-foreground">
                {dict.home.noPosts}
                <br />
                <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs">
                  content/posts/*.md
                </code>
                <br />
                <span className="mt-2 inline-block">{dict.home.noPostsHint}</span>
              </p>
            </>
          ) : (
            <HomePostList posts={posts} locale={locale} labels={dict.home} />
          )}
        </section>
      </div>
    </>
  );
}
