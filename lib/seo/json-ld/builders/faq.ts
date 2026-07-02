import type { JsonLdBuildContext, JsonLdThing } from "@/lib/seo/json-ld/types";

const MIN_FAQ_FOR_SCHEMA = 2;

export function buildFaqJsonLd(ctx: JsonLdBuildContext): JsonLdThing | null {
  if (ctx.faqItems.length < MIN_FAQ_FOR_SCHEMA) return null;

  return {
    "@type": "FAQPage",
    "@id": `${ctx.url}#faq`,
    mainEntity: ctx.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
