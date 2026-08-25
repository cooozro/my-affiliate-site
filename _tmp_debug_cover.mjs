import { resolveImageContext, scoreImageRelevance, passesProductAltGate } from "./scripts/lib/image-query.mjs";
import fs from "fs";

const slug = "2026-compact-dishwasher-vs-portable-washer";
const raw = fs.readFileSync(`content/posts/${slug}/en.md`, "utf8");
const title = raw.match(/^title:\s*(.+)/m)?.[1];
const ctx = resolveImageContext(slug, {
  title,
  tags: ["compact appliances", "countertop dishwasher", "portable washer"],
});
console.log("anchors", ctx.requiredAnchors);
for (const q of ["countertop dishwasher", "portable washing machine", "compact laundry appliance"]) {
  const r = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY } },
  );
  const d = await r.json();
  console.log("query", q, "hits", (d.photos ?? []).length);
  for (const p of d.photos ?? []) {
    const alt = p.alt ?? "";
    const gate = passesProductAltGate(alt, ctx.requiredAnchors);
    const sc = scoreImageRelevance(
      alt,
      ctx.productKeywords,
      ctx.negativeTags,
      ctx.seasonContext,
      ctx.topicId,
      ctx.slug,
    );
    console.log(" ", p.id, "gate", gate, "score", sc, "alt", alt.slice(0, 90));
  }
}
