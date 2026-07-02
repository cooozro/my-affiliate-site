import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  defaultLocale,
  isValidLocale,
  locales,
  type Locale,
} from "@/lib/i18n/config";

/** Root `/` only — Korean Accept-Language visitors land on /ko for Naver/KR UX. */
function localeForRoot(request: NextRequest): Locale {
  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (accept.includes("ko")) return "ko";
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!pathnameHasLocale) {
    const locale = pathname === "/" ? localeForRoot(request) : defaultLocale;
    const redirectUrl = new URL(
      `/${locale}${pathname === "/" ? "" : pathname}`,
      request.url,
    );
    // 308 = permanent redirect (root has no content; /ko or /en is canonical)
    return NextResponse.redirect(redirectUrl, 308);
  }

  const segment = pathname.split("/")[1];
  if (segment && !isValidLocale(segment)) {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
