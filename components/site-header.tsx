import Link from "next/link";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTENT_SHELL } from "@/lib/layout";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/messages/en";
import { siteConfig } from "@/lib/site";

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export function SiteHeader({ locale, dict }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className={`flex h-16 items-center justify-between ${CONTENT_SHELL}`}>
        <Link
          href={localizedPath(locale)}
          className="font-sans text-lg font-semibold tracking-tight text-foreground transition hover:text-accent"
        >
          {siteConfig.name}
        </Link>
        <nav
          className="flex items-center gap-3 sm:gap-4"
          aria-label={dict.nav.mainMenu}
        >
          <Link
            href={localizedPath(locale)}
            className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline"
          >
            {dict.nav.home}
          </Link>
          <Link
            href={localizedPath(locale, "/about")}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            {dict.nav.about}
          </Link>
          <Link
            href={localizedPath(locale, "/contact")}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            {dict.nav.contact}
          </Link>
          <AdminNavLink />
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
