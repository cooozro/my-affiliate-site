#!/usr/bin/env node
/**
 * Vercel Ignored Build Step.
 * Exit 0 = skip build, Exit 1 = proceed.
 *
 * Skip routine admin saves/image uploads (Hobby quota).
 * ALWAYS build for publish/unpublish/delete so homepage + /blog/[slug] SSG
 * pick up draft→live changes (content is read from the deploy bundle FS).
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

function commitMessage() {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync("git log -1 --pretty=%B", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
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
      (p.startsWith("data/automation/") && p.endsWith(".json"))
    );
  });
}

function mustBuildForVisibility(message, files) {
  const msg = message || "";
  // Publish / draft toggle / delete must refresh public routes.
  if (/\badmin:\s*(publish|unpublish|delete|draft)\b/i.test(msg)) return true;
  if (/\bpublish\b/i.test(msg) && /\badmin:/i.test(msg)) return true;

  // New post directory appearing under content/posts/{slug}/
  const postFiles = (files || []).filter((f) =>
    f.replace(/\\/g, "/").startsWith("content/posts/"),
  );
  const slugs = new Set(
    postFiles
      .map((f) => f.replace(/\\/g, "/").split("/")[2])
      .filter(Boolean),
  );
  for (const slug of slugs) {
    try {
      const prev = execSync(
        `git show HEAD^:content/posts/${slug}/ko.md`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const curr = execSync(`git show HEAD:content/posts/${slug}/ko.md`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const prevDraft = /^\s*draft:\s*true\b/m.test(prev);
      const currDraft = /^\s*draft:\s*true\b/m.test(curr);
      if (prevDraft && !currDraft) return true; // published
      if (!prevDraft && currDraft) return true; // unpublished
    } catch {
      // New slug (no previous file) — include in public bundle.
      if ((files || []).some((f) => f.includes(`content/posts/${slug}/`))) {
        return true;
      }
    }
  }
  return false;
}

const files = changedFiles();
if (files === null) {
  console.log("vercel-ignore: cannot diff — proceed with build");
  process.exit(1);
}

const message = commitMessage();
if (mustBuildForVisibility(message, files)) {
  console.log(
    `vercel-ignore: build (visibility change: ${message.split("\n")[0].slice(0, 80)})`,
  );
  process.exit(1);
}

if (isContentOnly(files)) {
  console.log(
    `vercel-ignore: skip build (${files.length} content/image-only file(s))`,
  );
  process.exit(0);
}

console.log(
  `vercel-ignore: build (${files
    .filter(
      (f) =>
        !f.startsWith("content/") &&
        !f.startsWith("public/images/") &&
        !f.startsWith("images/"),
    )
    .slice(0, 8)
    .join(", ")})`,
);
process.exit(1);
