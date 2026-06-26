import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { buildRssFeed } from "@/lib/feed";
import { isValidLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ locale: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { locale: localeParam } = await context.params;

  if (!isValidLocale(localeParam)) {
    notFound();
  }

  const dict = await getDictionary(localeParam);
  const xml = buildRssFeed(localeParam, dict.meta.siteDescription);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
