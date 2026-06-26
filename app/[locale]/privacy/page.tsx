import type { Metadata } from "next";
import { ARTICLE_SHELL } from "@/lib/layout";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return {
    title: dict.privacy.title,
    description: dict.privacy.metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${siteConfig.url}${localizedPath(locale, "/privacy")}`,
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          `${siteConfig.url}${localizedPath(l, "/privacy")}`,
        ]),
      ),
    },
    openGraph: {
      title: dict.privacy.title,
      description: dict.privacy.metaDescription,
      url: `${siteConfig.url}${localizedPath(locale, "/privacy")}`,
      locale: ogLocales[locale],
    },
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);
  const { sections } = dict.privacy;

  return (
    <article className={ARTICLE_SHELL}>
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        {dict.privacy.title}
      </h1>
      <p className="mt-3 font-sans text-sm text-muted-foreground">
        {dict.privacy.lastUpdated}
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        {Object.values(sections).map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="text-muted-foreground">{section.body}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
