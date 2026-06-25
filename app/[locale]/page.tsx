import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { PostCard } from "@/components/post-card";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

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
  const posts = getAllPosts(locale);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <HomeHero description={dict.meta.siteDescription} />

      <section aria-labelledby="latest-posts-heading">
        <h2
          id="latest-posts-heading"
          className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {dict.home.latestPosts} ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center font-sans text-sm text-muted-foreground">
            {dict.home.noPosts}
            <br />
            <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs">
              content/posts/*.md
            </code>
            <br />
            <span className="mt-2 inline-block">{dict.home.noPostsHint}</span>
          </p>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                locale={locale}
                readMoreLabel={dict.home.readMore}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
