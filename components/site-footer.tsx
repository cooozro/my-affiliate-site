import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/messages/en";
import { siteConfig } from "@/lib/site";

type SiteFooterProps = {
  locale: Locale;
  dict: Dictionary;
};

export function SiteFooter({ locale, dict }: SiteFooterProps) {
  const year = new Date().getFullYear();

  const links = [
    { href: localizedPath(locale), label: dict.nav.home },
    { href: localizedPath(locale, "/about"), label: dict.nav.about },
    { href: localizedPath(locale, "/contact"), label: dict.nav.contact },
    { href: localizedPath(locale, "/privacy"), label: dict.footer.privacy },
    {
      href: `${siteConfig.url}/${locale}/feed.xml`,
      label: dict.footer.rss,
      external: true,
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-sans text-sm font-medium text-foreground">
          {siteConfig.name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {dict.meta.siteDescription}
        </p>
        <nav
          className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm"
          aria-label={dict.footer.menu}
        >
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                className="font-medium text-foreground/80 underline-offset-4 transition hover:text-accent hover:underline"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-foreground/80 underline-offset-4 transition hover:text-accent hover:underline"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
        <p className="mx-auto mt-8 max-w-xl border-t border-border/50 pt-6 text-center font-sans text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
          {dict.footer.publicationTagline}
        </p>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {year} {siteConfig.name}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
