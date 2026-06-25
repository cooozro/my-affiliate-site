import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { fontClassNames } from "@/lib/fonts";
import { isValidLocale, locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
      className={`${fontClassNames} h-full`}
    >
      <head>
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
          href={`https://www.aipick.shop/en`}
        />
        <meta property="og:locale" content={ogLocales[locale]} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader locale={locale} dict={dict} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
        </ThemeProvider>
      </body>
    </html>
  );
}
