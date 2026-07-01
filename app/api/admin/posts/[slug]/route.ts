import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import {
  deletePost,
  draftPost,
  publishPost,
  refreshCoverImage,
  removeCoverImage,
} from "@/lib/admin-actions";

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

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = (await request.json()) as {
    action?: "publish" | "draft" | "refresh-cover" | "remove-cover";
  };

  try {
    if (body.action === "publish") {
      const result = await publishPost(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "draft") {
      const result = await draftPost(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "refresh-cover") {
      const result = await refreshCoverImage(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "remove-cover") {
      const result = await removeCoverImage(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const result = await deletePost(slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
