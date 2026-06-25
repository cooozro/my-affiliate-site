import type { Locale } from "@/lib/i18n/config";
import type { MarketSnapshot } from "@/lib/market-data";

export type ContentVarContext = {
  locale: Locale;
  market: MarketSnapshot;
  now?: Date;
};

function formatToday(locale: Locale, now: Date): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
}

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
  const now = context.now ?? new Date();
  const { locale, market } = context;
  const rateFormatted = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  ).format(market.usdKrwRate);

  let result = content;

  result = result.replaceAll("{{usd_krw_rate}}", rateFormatted);
  result = result.replaceAll("{{today}}", formatToday("en", now));
  result = result.replaceAll("{{today_ko}}", formatToday("ko", now));
  result = result.replaceAll(
    "{{today_locale}}",
    formatToday(locale, now),
  );

  result = result.replace(/\{\{krw:([\d.]+)\}\}/g, (_, usdRaw: string) => {
    const usd = Number.parseFloat(usdRaw);
    if (!Number.isFinite(usd)) {
      return usdRaw;
    }

    return formatKrw(usdToKrw(usd, market.usdKrwRate), locale);
  });

  return result;
}

export function liveDataDisclaimer(
  locale: Locale,
  market: MarketSnapshot,
): string {
  const rate = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  ).format(market.usdKrwRate);

  if (locale === "ko") {
    return `원화 환산은 ${market.fetchedAt} 기준 USD/KRW ${rate}원(출처: ${market.source})을 적용했습니다.`;
  }

  return `KRW conversions use USD/KRW ${rate} as of ${market.fetchedAt} (${market.source}).`;
}
