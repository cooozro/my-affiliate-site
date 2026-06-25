import type { Metadata } from "next";
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

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <p className="font-sans text-sm text-muted-foreground">
          {dict.contact.emailLabel}
        </p>
        <a
          href={`mailto:${dict.contact.email}`}
          className="mt-1 inline-block font-sans text-lg font-medium text-accent hover:underline"
        >
          {dict.contact.email}
        </a>
        <p className="mt-4 font-sans text-sm text-muted-foreground">
          {dict.contact.responseTime}
        </p>
      </div>

      <form
        className="mt-10 space-y-6"
        action={`mailto:${dict.contact.email}`}
        method="POST"
        encType="text/plain"
      >
        <div>
          <label
            htmlFor="contact-name"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.contact.nameLabel}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.contact.emailLabel}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="contact-message"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.contact.messageLabel}
          </label>
          <textarea
            id="contact-message"
            name="body"
            rows={6}
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-6 py-2.5 font-sans text-sm font-medium text-white transition hover:opacity-90"
        >
          {dict.contact.submit}
        </button>
      </form>
    </article>
  );
}
