#!/usr/bin/env node
/**
 * Smoke test: render Guardian (meta, JSON-LD, article chrome) after migration.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_TAGLINE_EN =
  "AI Pick & Report is an independent tech review publication dedicated to data-backed buying guides.";
const EXPECTED_TAGLINE_KO =
  "AI Pick & Report는 데이터 기반 구매 가이드에 전념하는 독립 기술 리뷰 매체입니다.";

function run(label, cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const ok = result.status === 0;
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) {
    if (result.stdout?.trim()) console.log(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
  }
  return ok;
}

let failed = 0;

if (!run("render:check-boundary", "npm", ["run", "guardian:check-render-boundary"])) {
  failed += 1;
}

// Source wiring checks
const pageSrc = fs.readFileSync(
  path.join(ROOT, "app/[locale]/blog/[slug]/page.tsx"),
  "utf8",
);
const layoutSrc = fs.readFileSync(
  path.join(ROOT, "components/article-layout.tsx"),
  "utf8",
);

if (!pageSrc.includes('from "@/lib/guardian"')) {
  failed += 1;
  console.error("❌ page.tsx must import from @/lib/guardian");
} else {
  console.log("✅ page.tsx imports @/lib/guardian");
}

if (!pageSrc.includes("buildBlogPostMetadata")) {
  failed += 1;
  console.error("❌ page.tsx missing buildBlogPostMetadata");
} else {
  console.log("✅ page.tsx uses buildBlogPostMetadata");
}

if (!pageSrc.includes("buildBlogPostPageJsonLd")) {
  failed += 1;
  console.error("❌ page.tsx missing buildBlogPostPageJsonLd");
} else {
  console.log("✅ page.tsx uses buildBlogPostPageJsonLd");
}

if (!layoutSrc.includes("ARTICLE_CHROME_RULES")) {
  failed += 1;
  console.error("❌ article-layout missing ARTICLE_CHROME_RULES");
} else {
  console.log("✅ article-layout uses ARTICLE_CHROME_RULES");
}

if (!layoutSrc.includes('variant="top"') && !layoutSrc.includes('placement="top"')) {
  failed += 1;
  console.error("❌ article-layout missing top share bar");
} else {
  console.log("✅ article-layout top share bar present");
}

if (!layoutSrc.includes('placement="bottom"')) {
  failed += 1;
  console.error("❌ article-layout missing bottom share bar");
} else {
  console.log("✅ article-layout bottom share bar present");
}

const pubCopy = fs.readFileSync(
  path.join(ROOT, "lib/guardian/publication-copy.ts"),
  "utf8",
);
if (!pubCopy.includes(EXPECTED_TAGLINE_EN)) {
  failed += 1;
  console.error("❌ EN publication tagline text missing or changed");
} else {
  console.log("✅ EN publication tagline preserved");
}

if (!pubCopy.includes(EXPECTED_TAGLINE_KO)) {
  failed += 1;
  console.error("❌ KO publication tagline text missing or changed");
} else {
  console.log("✅ KO publication tagline preserved");
}

if (!run("npm run build", "npm", ["run", "build"])) {
  failed += 1;
}

if (!run("guardian:check-boundary (pipeline)", "npm", ["run", "guardian:check-boundary"])) {
  failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} render Guardian smoke test(s) failed`);
  process.exit(1);
}

console.log("\nAll render Guardian smoke tests passed");
