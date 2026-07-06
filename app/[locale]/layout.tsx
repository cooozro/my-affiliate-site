import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GoogleAdSenseHead } from "@/components/google-adsense";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ThemeProvider } from "@/components/theme-provider";
import { fontClassNames } from "@/lib/fonts";
import { isValidLocale, locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { siteConfig } from "@/lib/site";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: localeParam } = await params;

  if (!isValidLocale(localeParam)) {
    notFound();
  }

  const locale = localeParam;
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontClassNames} min-h-screen`}
    >
      <head>
        <GoogleAdSenseHead />
        <meta name="google-adsense-account" content="ca-pub-9630508246667414" />
        <link
          rel="alternate"
          hrefLang="en"
          href={`https://www.aipick.shop/en`}
        />
        <link
          rel="alternate"
          hrefLang="ko"
          href={`https://www.aipick.shop/ko`}
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${siteConfig.url}/en`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${siteConfig.name} (${locale.toUpperCase()})`}
          href={`${siteConfig.url}/${locale}/feed.xml`}
        />
        <meta property="og:locale" content={ogLocales[locale]} />
        <meta
          name="naver-site-verification"
          content="87e4d3f412fa35084645462eeb1a048ada483475"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader locale={locale} dict={dict} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
