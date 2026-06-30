import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  integrityIssuesFlat,
  runPublishIntegrityGate,
} from "../lib/publish-integrity.mjs";
import { getPublishTopicHistory, inferPostTopic } from "../lib/infer-post-topic.mjs";
import { wouldViolateTopicDiversity } from "../lib/topic-diversity.mjs";
import { loadState } from "./state.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export function listSlugDirs() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function readPost(slug, locale) {
  const filePath = path.join(POSTS_DIR, slug, `${locale}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content: content.trim(), raw, filePath };
}

export function writePost(slug, locale, data, content) {
  const dir = path.join(POSTS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
  return filePath;
}

export function slugExists(slug) {
  return fs.existsSync(path.join(POSTS_DIR, slug));
}

export function listDrafts() {
  const slugs = listSlugDirs();
  const drafts = [];

  for (const slug of slugs) {
    const enPath = path.join(POSTS_DIR, slug, "en.md");
    const koPath = path.join(POSTS_DIR, slug, "ko.md");
    if (!fs.existsSync(enPath) || !fs.existsSync(koPath)) continue;

    const en = readPost(slug, "en");
    if (!en.data.draft) continue;

    drafts.push({
      slug,
      createdAt: en.data.createdAt ?? fs.statSync(enPath).mtime.toISOString(),
      title: en.data.title,
    });
  }

  return drafts.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function countDrafts() {
  return listDrafts().length;
}

export function pickDraftForPublish(drafts, state = loadState()) {
  const history = getPublishTopicHistory(state);

  for (const draft of drafts) {
    const { data } = readPost(draft.slug, "en");
    const topic = inferPostTopic(draft.slug, data);
    const violation = wouldViolateTopicDiversity(
      {
        id: topic.id,
        category: topic.category,
        topicCluster: topic.cluster,
      },
      history,
    );

    if (!violation.blocked) {
      if (draft.slug !== drafts[0]?.slug) {
        console.log(
          `Publish queue: skipped earlier draft(s) — picked ${draft.slug} to avoid topic clustering (${topic.cluster ?? topic.id}).`,
        );
      }
      return draft;
    }
  }

  return null;
}

/**
 * Run publish integrity gate. Returns blocking issue messages (empty = pass).
 * @param {string} slug
 * @param {{ phase?: 'draft'|'publish', state?: object, applyRepair?: boolean }} [options]
 */
export function validatePostFiles(slug, options = {}) {
  const root = process.cwd();
  const phase = options.phase ?? "publish";
  const state =
    options.state ?? (phase === "publish" ? loadState() : null);
  const applyRepair = options.applyRepair !== false;

  const result = runPublishIntegrityGate(root, slug, {
    phase,
    state,
    applyRepair,
  });

  return integrityIssuesFlat(result);
}
