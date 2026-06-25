import { ogLocales } from "@/lib/i18n/config";

export const siteConfig = {
  name: "AI Pick & Report",
  description:
    "Data-driven tech reviews and buying guides for smartphones, gadgets, and consumer electronics.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop",
  locale: ogLocales.en,
  author: "AI Pick & Report",
  /** Public-facing contact address shown on the site */
  contactDisplayEmail: "contact@aipick.shop",
  /** Actual inbox where messages are delivered */
  contactEmail: "coooz@naver.com",
};
