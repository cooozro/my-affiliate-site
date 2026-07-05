/**
 * Write ONLY the admin SEO audit draft — never touches published posts.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { kstDateString } from "../../automation/state.mjs";
import {
  SEO_AUDIT_REPORT_JSON,
  SEO_AUDIT_SLUG,
} from "./constants.mjs";
import { buildFrontmatter } from "./report-builder.mjs";

export function writeSeoAuditDraft(root, markdownBody, analysisPayload) {
  const slugDir = path.join(root, "content", "posts", SEO_AUDIT_SLUG);
  fs.mkdirSync(slugDir, { recursive: true });

  const dateKst = kstDateString();
  const frontmatter = buildFrontmatter(dateKst);
  frontmatter.updatedAt = new Date().toISOString();

  const koPath = path.join(slugDir, "ko.md");
  const fileContent = matter.stringify(markdownBody, frontmatter);
  fs.writeFileSync(koPath, fileContent, "utf8");

  const reportPath = path.join(root, SEO_AUDIT_REPORT_JSON);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(analysisPayload, null, 2)}\n`,
    "utf8",
  );

  return { koPath, reportPath };
}
