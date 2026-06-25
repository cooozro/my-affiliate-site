import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
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
            className="hidden text-sm text-muted-foreground transition hover:text-foreground md:inline"
          >
            {dict.nav.about}
          </Link>
          <Link
            href={localizedPath(locale, "/contact")}
            className="hidden text-sm text-muted-foreground transition hover:text-foreground md:inline"
          >
            {dict.nav.contact}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
