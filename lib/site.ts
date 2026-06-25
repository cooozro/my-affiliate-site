import { ogLocales } from "@/lib/i18n/config";

export const siteConfig = {
  name: "AI Pick & Report",
  description:
    "Data-driven tech reviews and buying guides for smartphones, gadgets, and consumer electronics.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop",
  locale: ogLocales.en,
  author: "AI Pick & Report",
  /** Private inbox — never rendered on the public site */
  contactEmail: process.env.CONTACT_EMAIL ?? "coooz@naver.com",
};
