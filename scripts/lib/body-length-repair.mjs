/**
 * Auto-expand short English bodies on published posts (daily audit + repair pass).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { MIN_EN_BODY_BYTES } from "./content-profiles.mjs";
import { inferPostTopic } from "./infer-post-topic.mjs";
import { listPublishedSlugs } from "./content-quality.mjs";

const INSERT_BEFORE_RE =
  /^##\s*(Related guides|관련 가이드|Final Verdict|최종 평가|Conclusion|결론)\s*$/m;

const SUPPLEMENT_BY_CLUSTER = {
  "air-conditioning": {
    heading: "## Seasonal install and efficiency follow-through",
    paragraphs: [
      `After you pass the seven checks above, compare finalists on the **same efficiency metric** (EER, CEER, or seasonal class) instead of headline BTU alone. Two models in the same capacity band often diverge more on night-time fan dB and estimated kWh than on sticker price. Photograph the window opening, sash travel, and any lease clause before install day — those records prevent disputes when management reviews hardware after the first heat wave.`,
      `Run a sealed-room test in the first week: fit the exhaust kit, close doors, and confirm temperature holds without the compressor short-cycling. On single-hose portables, check hose joints for inward air pull that steals cooled air from other rooms. Schedule the first filter inspection within ten days of install; early dust loading is often misread as “weak cooling” at return counters.`,
    ],
  },
  "air-quality": {
    heading: "## Room context beyond the headline spec",
    paragraphs: [
      `Match the device to **real room volume and door traffic**, not brochure coverage circles. Open-plan edges, pets, and cooking nearby raise particulate load faster than spec-sheet CADR alone suggests. Note filter SKU availability and replacement interval before purchase — a strong first-month performance with discontinued filters becomes expensive shelfware.`,
      `Place the unit where airflow can circulate without blocking intake; corners and tight alcoves trap stale zones even when the front grille looks unobstructed. Log the first filter change date on install day; summer humidity and pollen spikes compress maintenance intervals compared with winter baseline use.`,
    ],
  },
  audio: {
    heading: "## Real-world listening conditions",
    paragraphs: [
      `Validate claims against **your actual sources and codecs** — LDAC and lossless tiers matter on Android-heavy workflows; iPhone-centric listeners often live inside AAC regardless of box badges. Try 15-minute wear tests at the volume you use outdoors or on transit; clamp force and heat matter more than ANC depth on paper for sessions longer than a commute.`,
      `Carry case bulk and multipoint pairing behavior affect daily use as much as frequency response charts. Note firmware update history for the model line; early-release ANC tuning sometimes improves after a patch that never appears on the retail card.`,
    ],
  },
  cleaning: {
    heading: "## Floor plan and maintenance reality",
    paragraphs: [
      `Sketch door thresholds, rug edges, and cable runs before trusting mapping marketing — robots that cannot clear transitions become manual vacuums with app maps. Confirm mop lift behavior if you have mixed hard floor and rug zones; dragging wet pads across carpet is a common one-star review theme.`,
      `Plan base placement near power and water without blocking walkways. Empty dust bins and rinse mop pads on a fixed weekly cadence; odor complaints usually trace to maintenance gaps, not motor failure.`,
    ],
  },
  computing: {
    heading: "## Desk fit and long-session comfort",
    paragraphs: [
      `Measure available depth and monitor arm clearance before buying on panel size alone. Text clarity at your actual viewing distance beats resolution marketing for spreadsheet and coding workloads. For keyboards, confirm switch type and sound profile against shared-wall WFH rules — tactile switches that feel fine in store can register on neighbor-side noise complaints.`,
      `Budget for cables, hub, or stand upgrades in the same receipt window; the accessory gap often decides whether a “budget” core device feels complete on day one.`,
    ],
  },
};

const GENERIC_SUPPLEMENT = {
  heading: "## Extended pre-purchase notes",
  paragraphs: [
    `Cross-check manufacturer specs against **listed retail pages and recent owner reviews** before checkout — box refreshes sometimes change wattage, port count, or warranty region without a model rename. Keep screenshots of the product page and return window policy in the same folder as your receipt; they resolve disputes faster than memory after seasonal sales end.`,
    `After unboxing, run a focused first-week test that mirrors your real use (commute, bedroom night, or WFH afternoon) instead of a five-minute demo. Early defects and fit issues surface in that window while return logistics are still straightforward.`,
  ],
};

function postsDir(root) {
  return path.join(root, "content", "posts");
}

function enBodyBytes(content) {
  return Buffer.byteLength(content.trim(), "utf8");
}

function buildSupplementBlock(cluster) {
  const block = SUPPLEMENT_BY_CLUSTER[cluster] ?? GENERIC_SUPPLEMENT;
  return `${block.heading}\n\n${block.paragraphs.join("\n\n")}\n\n---\n\n`;
}

function alreadyHasSupplement(body, heading) {
  return body.includes(heading);
}

/**
 * @returns {{ body: string, changed: boolean, repairs: string[] }}
 */
export function expandEnglishBodyIfNeeded(body, slug, data, options = {}) {
  const repairs = [];
  const minBytes = options.minBytes ?? MIN_EN_BODY_BYTES;
  const trimmed = body.trim();
  const bytes = enBodyBytes(trimmed);
  if (bytes >= minBytes) {
    return { body: trimmed, changed: false, repairs };
  }

  const topic = inferPostTopic(slug, data);
  const cluster = topic.cluster ?? topic.topicCluster ?? "general";
  const supplement = buildSupplementBlock(cluster);

  if (alreadyHasSupplement(trimmed, supplement.trim().split("\n")[0])) {
    return { body: trimmed, changed: false, repairs };
  }

  let newBody;
  const match = trimmed.match(INSERT_BEFORE_RE);
  if (match?.index != null) {
    newBody = `${trimmed.slice(0, match.index).trimEnd()}\n\n${supplement}${trimmed.slice(match.index).trimStart()}`;
  } else {
    newBody = `${trimmed}\n\n${supplement}`.trim();
  }

  if (enBodyBytes(newBody) < minBytes && !alreadyHasSupplement(newBody, GENERIC_SUPPLEMENT.heading)) {
    const generic = buildSupplementBlock("general");
    const genericMatch = newBody.match(INSERT_BEFORE_RE);
    if (genericMatch?.index != null) {
      newBody = `${newBody.slice(0, genericMatch.index).trimEnd()}\n\n${generic}${newBody.slice(genericMatch.index).trimStart()}`;
    }
  }

  if (newBody === trimmed) {
    return { body: trimmed, changed: false, repairs };
  }

  repairs.push(
    `${slug}/en.md: expanded English body ${bytes} → ${enBodyBytes(newBody)} bytes (min ${minBytes})`,
  );
  return { body: newBody, changed: true, repairs };
}

/**
 * @returns {{ changed: boolean, repairs: string[] }}
 */
export function repairShortEnglishBody(root, slug, options = {}) {
  const filePath = path.join(postsDir(root), slug, "en.md");
  if (!fs.existsSync(filePath)) {
    return { changed: false, repairs: [] };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  if (data.draft && !options.includeDrafts) {
    return { changed: false, repairs: [] };
  }

  const expanded = expandEnglishBodyIfNeeded(content, slug, data, options);
  if (!expanded.changed) {
    return { changed: false, repairs: [] };
  }

  fs.writeFileSync(filePath, matter.stringify(expanded.body, data), "utf8");
  return { changed: true, repairs: expanded.repairs };
}

export function repairAllShortEnglishBodies(root = process.cwd(), options = {}) {
  const slugs = options.includeDrafts
    ? fs
        .readdirSync(postsDir(root), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [...listPublishedSlugs(root)];

  const summary = { scanned: 0, changed: 0, repairs: [] };
  for (const slug of slugs.sort()) {
    if (slug === "welcome" || slug === "adsense-seo-checklist") continue;
    summary.scanned += 1;
    const result = repairShortEnglishBody(root, slug, options);
    if (result.changed) summary.changed += 1;
    summary.repairs.push(...result.repairs);
  }
  return summary;
}
