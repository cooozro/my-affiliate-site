import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import {
  loadManualPost,
  saveManualPostFromKo,
} from "@/lib/admin-manual-post-service";

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
  const post = await loadManualPost(slug);
  if (!post) {
    return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const body = (await request.json()) as {
      titleKo?: string;
      descriptionKo?: string;
      bodyKo?: string;
      tags?: string[];
      shareTop?: boolean;
      shareBottom?: boolean;
      coverImage?: string;
      coverImageAltKo?: string;
    };

    const result = await saveManualPostFromKo(
      {
        titleKo: body.titleKo ?? "",
        descriptionKo: body.descriptionKo,
        bodyKo: body.bodyKo ?? "",
        tags: body.tags,
        shareTop: body.shareTop,
        shareBottom: body.shareBottom,
        coverImage: body.coverImage,
        coverImageAltKo: body.coverImageAltKo,
      },
      slug,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
