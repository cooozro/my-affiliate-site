import type { Locale } from "@/lib/i18n/config";
import type { MarketSnapshot } from "@/lib/market-data";
import {
  priceFallbackText,
  resolveLivePlaceholders,
} from "@/lib/site-engine";

export type ContentVarContext = {
  locale: Locale;
  market: MarketSnapshot;
  now?: Date;
};

export function formatKrw(amount: number, locale: Locale): string {
  const formatted = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  ).format(amount);

  return locale === "ko" ? `${formatted}원` : `₩${formatted}`;
}

export function usdToKrw(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

export function resolveContentPlaceholders(
  content: string,
  context: ContentVarContext,
): string {
  const rate =
    context.market.ok &&
    context.market.usdKrwRate != null &&
    context.market.usdKrwRate > 0
      ? context.market.usdKrwRate
      : undefined;
  return resolveLivePlaceholders(content, context.locale, {
    now: context.now,
    usdKrwRate: rate,
  });
}

export function liveDataDisclaimer(
  locale: Locale,
  market: MarketSnapshot,
): string {
  if (!market.ok || market.usdKrwRate == null) {
    return priceFallbackText(locale);
  }

  const rate = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  ).format(market.usdKrwRate);

  if (locale === "ko") {
    return `원화 환산은 ${market.fetchedAt} 기준 USD/KRW ${rate}원(출처: ${market.source})을 적용했습니다.`;
  }

  return `KRW conversions use USD/KRW ${rate} as of ${market.fetchedAt} (${market.source}).`;
}
