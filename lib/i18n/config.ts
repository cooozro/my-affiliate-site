export const locales = ["en", "ko"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "EN",
  ko: "KO",
};

export const ogLocales: Record<Locale, string> = {
  en: "en_US",
  ko: "ko_KR",
};

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
