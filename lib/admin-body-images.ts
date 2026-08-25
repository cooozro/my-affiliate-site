import "server-only";

import fs from "fs";
import path from "path";
import {
  assertGithubAdminConfigured,
  usesRemotePostStore,
  slugExists,
} from "@/lib/posts-admin";
import {
  deleteGithubFile,
  listGithubDirectory,
  readGithubFile,
  writeGithubBinaryFile,
} from "@/lib/admin-services";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

function postImagesDir(slug: string): string {
  return path.join(process.cwd(), "public", "images", "posts", slug);
}

function webPath(slug: string, filename: string): string {
  return `/images/posts/${slug}/${filename}`;
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function listPostBodyImages(slug: string): string[] {
  const dir = postImagesDir(slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
}

export async function listPostBodyImagesAsync(slug: string): Promise<string[]> {
  if (usesRemotePostStore()) {
    try {
      const entries = await listGithubDirectory(`public/images/posts/${slug}`);
      return entries
        .filter(
          (entry) =>
            entry.type === "file" &&
            /\.(jpe?g|png|webp)$/i.test(entry.name ?? ""),
        )
        .map((entry) => entry.name!)
        .sort();
    } catch {
      return [];
    }
  }
  return listPostBodyImages(slug);
}

export async function uploadPostBodyImage(
  slug: string,
  file: { buffer: Buffer; mimeType: string; originalName?: string },
  filename?: string,
): Promise<{ webPath: string; filename: string }> {
  if (!slugExists(slug)) throw new Error(`Post not found: ${slug}`);
  if (!ALLOWED_MIME.has(file.mimeType)) {
    throw new Error("JPEG, PNG, WebP만 업로드할 수 있습니다.");
  }
  if (file.buffer.length > MAX_BYTES) {
    throw new Error("이미지는 4MB 이하여야 합니다.");
  }

  const base =
    filename?.trim() ||
    (file.originalName?.replace(/[^\w.-]+/g, "-").toLowerCase() ?? "image");
  let name = base.includes(".") ? base : `${base}.${extForMime(file.mimeType)}`;
  const dir = postImagesDir(slug);
  fs.mkdirSync(dir, { recursive: true });

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const repoPath = `public/images/posts/${slug}/${name}`;
    await writeGithubBinaryFile(repoPath, file.buffer, `admin: upload image ${slug}/${name}`);
  } else {
    let dest = path.join(dir, name);
    let n = 2;
    while (fs.existsSync(dest)) {
      const stem = name.replace(/\.[^.]+$/, "");
      const ext = name.split(".").pop() ?? "jpg";
      name = `${stem}-${n}.${ext}`;
      dest = path.join(dir, name);
      n += 1;
    }
    fs.writeFileSync(dest, file.buffer);
  }

  return { webPath: webPath(slug, name), filename: name };
}

export async function deletePostBodyImage(
  slug: string,
  filename: string,
): Promise<void> {
  if (!slugExists(slug)) throw new Error(`Post not found: ${slug}`);
  const safe = path.basename(filename);
  const filePath = path.join(postImagesDir(slug), safe);
  if (!fs.existsSync(filePath)) throw new Error("Image not found");

  if (usesRemotePostStore()) {
    assertGithubAdminConfigured();
    const repoPath = `public/images/posts/${slug}/${safe}`;
    const existing = await readGithubFile(repoPath);
    await deleteGithubFile(
      repoPath,
      existing.sha,
      `admin: delete image ${slug}/${safe}`,
    );
  } else {
    fs.unlinkSync(filePath);
  }
}
