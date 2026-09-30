#!/usr/bin/env node
/**
 * Vercel Ignored Build Step.
 * Exit 0 = skip build, Exit 1 = proceed.
 *
 * Admin manual saves commit content/posts + images very often and burn the
 * Hobby deploy quota (rate limit). Skip when ONLY those paths change.
 * Code/config changes still build. Admin preview reads GitHub live anyway.
 */
import { execSync } from "node:child_process";

function changedFiles() {
  const envBase = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
  const head = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || "HEAD";
  const attempts = [];
  if (envBase) attempts.push([envBase, head]);
  attempts.push(["HEAD^", "HEAD"]);
  attempts.push(["HEAD~1", "HEAD"]);

  for (const [base, tip] of attempts) {
    try {
      const out = execSync(`git diff --name-only ${base} ${tip}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (out) return out.split("\n").filter(Boolean);
    } catch {
      /* try next */
    }
  }
  return null;
}

function isContentOnly(files) {
  if (!files || files.length === 0) return true;
  return files.every((f) => {
    const p = f.replace(/\\/g, "/");
    return (
      p.startsWith("content/") ||
      p.startsWith("public/images/") ||
      p.startsWith("images/") ||
      p === "data/automation/state.json" ||
      p.startsWith("data/automation/") && p.endsWith(".json")
    );
  });
}

const files = changedFiles();
if (files === null) {
  console.log("vercel-ignore: cannot diff — proceed with build");
  process.exit(1);
}

if (isContentOnly(files)) {
  console.log(
    `vercel-ignore: skip build (${files.length} content/image-only file(s))`,
  );
  process.exit(0);
}

console.log(
  `vercel-ignore: build (${files.filter((f) => !f.startsWith("content/") && !f.startsWith("public/images/") && !f.startsWith("images/")).slice(0, 8).join(", ")})`,
);
process.exit(1);
