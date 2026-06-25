import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
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
    title: dict.contact.title,
    description: dict.contact.metaDescription,
    alternates: {
      canonical: `${siteConfig.url}${localizedPath(locale, "/contact")}`,
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          `${siteConfig.url}${localizedPath(l, "/contact")}`,
        ]),
      ),
    },
    openGraph: {
      title: dict.contact.title,
      description: dict.contact.metaDescription,
      url: `${siteConfig.url}${localizedPath(locale, "/contact")}`,
      locale: ogLocales[locale],
    },
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        {dict.contact.title}
      </h1>
      <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
        {dict.contact.intro}
      </p>

      <p className="mt-6 rounded-xl border border-border bg-muted/40 px-5 py-4 font-sans text-sm leading-relaxed text-muted-foreground">
        {dict.contact.formNotice}
      </p>

      <ContactForm
        deliveryEmail={siteConfig.contactEmail}
        dict={dict.contact}
      />

      <p className="mt-6 font-sans text-sm text-muted-foreground">
        {dict.contact.responseTime}
      </p>
    </article>
  );
}
