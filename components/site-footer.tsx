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

  return (
    <footer className="mt-auto border-t border-border/60 bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-sans text-sm text-muted-foreground">
          © {year} {siteConfig.name}. {dict.footer.rights}
        </p>
        <nav
          className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
          aria-label={dict.footer.menu}
        >
          <Link
            href={localizedPath(locale)}
            className="transition hover:text-foreground"
          >
            {dict.nav.home}
          </Link>
          <Link
            href={localizedPath(locale, "/about")}
            className="transition hover:text-foreground"
          >
            {dict.nav.about}
          </Link>
          <Link
            href={localizedPath(locale, "/contact")}
            className="transition hover:text-foreground"
          >
            {dict.nav.contact}
          </Link>
          <Link
            href={localizedPath(locale, "/privacy")}
            className="transition hover:text-foreground"
          >
            {dict.footer.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
