import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { uploadCoverImage } from "@/lib/admin-actions";
import {
  deletePostBodyImage,
  listPostBodyImagesAsync,
  uploadPostBodyImage,
} from "@/lib/admin-body-images";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function requireAdmin(request: Request) {
  const hasSession = await getAdminSessionFromCookies();
  if (!canAccessAdmin(request, hasSession) || !hasSession) {
    return false;
  }
  return true;
}

export async function GET(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const filenames = await listPostBodyImagesAsync(slug);
    const images = filenames.map((filename) => ({
      filename,
      webPath: `/images/posts/${slug}/${filename}`,
    }));
    return NextResponse.json({ ok: true, images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "List failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "body");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = {
      buffer,
      mimeType: file.type || "image/jpeg",
      originalName: file.name,
    };

    if (kind === "cover") {
      const result = await uploadCoverImage(slug, payload);
      return NextResponse.json({
        ok: true,
        kind: "cover",
        coverImage: result.coverImage,
        webPath: result.coverImage,
        ...result,
      });
    }

    const result = await uploadPostBodyImage(slug, payload);
    return NextResponse.json({ ok: true, kind: "body", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const file = new URL(request.url).searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file query required" }, { status: 400 });
  }

  try {
    await deletePostBodyImage(slug, file);
    return NextResponse.json({ ok: true, deleted: file });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
