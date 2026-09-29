import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { usesRemotePostStore } from "@/lib/posts-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string; filename: string }>;
};

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function safeName(input: string): string | null {
  const base = path.basename(input);
  if (!base) return null;
  if (base !== path.basename(input.replace(/\\/g, "/"))) return null;
  if (!/\.(jpe?g|png|webp|gif)$/i.test(base)) return null;
  return base;
}

async function readGithubBinaryFile(filePath: string): Promise<Buffer> {
  const repo = process.env.GITHUB_REPO?.trim() ?? "cooozro/my-affiliate-site";
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN required");

  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: rawSlug, filename: rawFile } = await context.params;
  const slug = decodeURIComponent(rawSlug);
  const filename = safeName(decodeURIComponent(rawFile));
  if (!slug || !filename || slug.includes("..") || slug.includes("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  const localPath = path.join(
    process.cwd(),
    "public",
    "images",
    "posts",
    slug,
    filename,
  );
  if (fs.existsSync(localPath)) {
    const buf = fs.readFileSync(localPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  }

  if (!(usesRemotePostStore() && process.env.GITHUB_TOKEN?.trim())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buf = await readGithubBinaryFile(
      `public/images/posts/${slug}/${filename}`,
    );
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
