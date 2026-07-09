/**
 * Regression tests: cordless stick vs robot vacuum image gates.
 * Run: node scripts/test/image-query-vacuum.mjs
 */
import assert from "node:assert/strict";
import {
  passesVacuumTypeAltGate,
  passesProductAltGate,
  requiredProductAnchors,
  isRobotVacuumAsset,
  scoreImageRelevance,
  vacuumTopicMode,
  TOPIC_IMAGE_PROFILES,
} from "../lib/image-query.mjs";

const cordless = { topicId: "cordless-vacuums", slug: "2026-cordless-vacuums-scenario-guide" };
const robot = { topicId: "robot-vacuums", slug: "2026-robot-vacuums-scenario-guide" };

assert.equal(vacuumTopicMode("cordless-vacuums", "any-slug"), "cordless");
assert.equal(vacuumTopicMode("robot-vacuums", "any-slug"), "robot");
assert.equal(vacuumTopicMode("laptops", "any-slug"), null);

// Regression: Pexels 35147242 was tagged like a cordless vacuum but shows a robot puck.
assert.equal(
  passesVacuumTypeAltGate("cordless vacuum cleaner on hardwood floor", cordless.topicId, cordless.slug),
  false,
  "generic cordless vacuum alt must not pass without stick/handheld marker",
);
assert.equal(
  passesVacuumTypeAltGate("robot vacuum on hardwood floor", cordless.topicId, cordless.slug),
  false,
);
assert.equal(
  passesVacuumTypeAltGate("cordless stick vacuum cleaning hardwood", cordless.topicId, cordless.slug),
  true,
);
assert.equal(
  passesVacuumTypeAltGate("handheld vacuum cleaner home interior", cordless.topicId, cordless.slug),
  true,
);

assert.equal(
  passesVacuumTypeAltGate("robot vacuum smart home hardwood", robot.topicId, robot.slug),
  true,
);
assert.equal(
  passesVacuumTypeAltGate("stick vacuum on floor", robot.topicId, robot.slug),
  false,
);

assert.ok(isRobotVacuumAsset("pexels", 35147242));
assert.ok(isRobotVacuumAsset("pexels", 8566426));
assert.equal(isRobotVacuumAsset("pexels", 36671734), false);

const cordlessAnchors = requiredProductAnchors([], "floor-care", cordless.topicId, cordless.slug);
assert.ok(!cordlessAnchors.includes("cordless vacuum"), "loose cordless vacuum anchor removed");
assert.ok(cordlessAnchors.includes("stick vacuum"));

const robotAltScore = scoreImageRelevance(
  "robot vacuum hardwood floor",
  ["robot vacuum"],
  [],
  null,
  robot.topicId,
  robot.slug,
);
const stickOnRobotScore = scoreImageRelevance(
  "stick vacuum cleaner product",
  ["robot vacuum"],
  [],
  null,
  robot.topicId,
  robot.slug,
);
assert.ok(robotAltScore > stickOnRobotScore);
assert.equal(stickOnRobotScore, -100);

assert.ok(TOPIC_IMAGE_PROFILES["cordless-vacuums"]?.forbiddenSubjects?.includes("robot vacuum"));
assert.ok(TOPIC_IMAGE_PROFILES["robot-vacuums"]?.forbiddenSubjects?.includes("stick vacuum"));

assert.ok(
  passesProductAltGate("cordless stick vacuum on floor", cordlessAnchors),
  "editorial alt must satisfy cordless anchors",
);

console.log("image-query-vacuum: all tests passed");
