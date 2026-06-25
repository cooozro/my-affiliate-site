"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  localeNames,
  locales,
  type Locale,
} from "@/lib/i18n/config";
import { switchLocalePath } from "@/lib/i18n/paths";

export function LocaleSwitcher() {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center rounded-full border border-border bg-surface p-0.5"
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => {
        const isActive =
          pathname === `/${locale}` || pathname.startsWith(`/${locale}/`);

        return (
          <Link
            key={locale}
            href={switchLocalePath(pathname, locale as Locale)}
            className={`rounded-full px-2.5 py-1 font-sans text-xs font-medium transition ${
              isActive
                ? "bg-accent text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
            lang={locale}
          >
            {localeNames[locale as Locale]}
          </Link>
        );
      })}
    </div>
  );
}
