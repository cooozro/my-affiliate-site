import type { JsonLdBuildContext, JsonLdThing } from "@/lib/seo/json-ld/types";

const CHECKLIST_STEP_RE = /^(\d+)\.\s+(.+)$/gm;

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Optional HowTo schema for checklist posts (disabled by default via config).
 * Parses numbered list items from the article body.
 */
export function buildHowToJsonLd(ctx: JsonLdBuildContext): JsonLdThing | null {
  if (ctx.contentProfile !== "checklist") return null;

  const steps: { position: number; name: string }[] = [];
  for (const match of ctx.content.matchAll(CHECKLIST_STEP_RE)) {
    const position = Number(match[1]);
    const name = stripMarkdownInline(match[2]);
    if (!name) continue;
    steps.push({ position, name });
  }

  if (steps.length < 3) return null;

  return {
    "@type": "HowTo",
    "@id": `${ctx.url}#howto`,
    name: ctx.title,
    description: ctx.description,
    step: steps.slice(0, 12).map((step) => ({
      "@type": "HowToStep",
      position: step.position,
      name: step.name,
    })),
  };
}
