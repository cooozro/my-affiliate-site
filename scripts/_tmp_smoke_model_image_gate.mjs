#!/usr/bin/env node
/**
 * Smoke: model-deep-dive image gate + press-kit allowlist holes.
 */
import assert from "assert";
import {
  isPressKitUrlAllowed,
  PRESS_KIT_PRODUCT_CDN_HOSTS,
} from "./lib/press-kit-images.mjs";
import {
  passesModelDeepDiveCandidate,
  evaluateModelImageText,
  auditModelDeepDiveImageRelevance,
} from "./lib/model-image-gate.mjs";
import { buildModelDeepDiveSearchQueries } from "./lib/model-deep-dive-images.mjs";

const sony = { brand: "Sony", name: "SRS-XG500", id: "sony-xg500" };

assert.equal(
  isPressKitUrlAllowed(
    "https://d1ncau8tqf99kp.cloudfront.net/PDP/Audio/Wireless-Speakers/SRS-XG500/mobile/1b.jpg",
    sony,
  ),
  true,
  "Sony PDP CDN allow",
);
assert.equal(
  PRESS_KIT_PRODUCT_CDN_HOSTS.includes("d1ncau8tqf99kp.cloudfront.net"),
  true,
);
assert.equal(
  isPressKitUrlAllowed("https://m.media-amazon.com/images/I/foo.jpg", sony),
  false,
  "Amazon blocked",
);

assert.equal(
  evaluateModelImageText("A stylish JBL Charge on a log", sony).ok,
  false,
  "rival JBL rejected",
);
assert.equal(
  evaluateModelImageText("MS-1615BT Hi-Fi speaker outdoors", sony).ok,
  false,
  "junk speaker rejected",
);

assert.equal(
  passesModelDeepDiveCandidate(
    {
      provider: "pexels",
      providerAlt: "portable bluetooth speaker outdoor product",
      searchQuery: "portable bluetooth speaker outdoor product",
    },
    sony,
    { role: "cover" },
  ).ok,
  false,
  "generic stock cover rejected",
);

assert.equal(
  passesModelDeepDiveCandidate(
    {
      provider: "press-kit",
      providerAlt: "anything",
    },
    sony,
    { role: "cover" },
  ).ok,
  true,
  "press-kit cover allowed",
);

const q = buildModelDeepDiveSearchQueries(sony, { id: "bluetooth-speakers" });
assert.ok(q[0].toLowerCase().includes("sony"), "queries lead with brand");
assert.ok(q[0].toLowerCase().includes("xg500") || q[0].toLowerCase().includes("srs"), "queries include model");

const auditHits = auditModelDeepDiveImageRelevance(
  "test-slug",
  {
    contentProfile: "model-deep-dive",
    modelPickBrand: "Sony",
    modelPickName: "SRS-XG500",
    coverImageProvider: "pexels",
    coverImageAlt: "A Marshall Bluetooth speaker on a table",
  },
  "",
);
assert.ok(auditHits.length > 0, "audit catches rival cover");

console.log("SMOKE_OK model-image-gate + press-kit allowlist");
