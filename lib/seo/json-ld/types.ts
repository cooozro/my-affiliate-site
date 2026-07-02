import type { FaqItem } from "@/lib/seo/faq-extract";
import type { Locale } from "@/lib/i18n/config";

export type JsonLdThing = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type BlogPostJsonLdInput = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  url: string;
  imageUrl?: string;
  tags?: string[];
  content: string;
  contentProfile?: string;
  breadcrumbs: BreadcrumbItem[];
};

export type JsonLdBuildContext = BlogPostJsonLdInput & {
  faqItems: FaqItem[];
};

export type JsonLdBuilder = (
  ctx: JsonLdBuildContext,
) => JsonLdThing | JsonLdThing[] | null;

export type JsonLdModuleId =
  | "article"
  | "breadcrumb"
  | "faq"
  | "author"
  | "howto";

export type JsonLdModuleConfig = {
  id: JsonLdModuleId;
  enabled: boolean;
  builder: JsonLdBuilder;
};
