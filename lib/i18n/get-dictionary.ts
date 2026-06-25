import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/messages/en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/messages/en").then((m) => m.default),
  ko: () => import("@/messages/ko").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
