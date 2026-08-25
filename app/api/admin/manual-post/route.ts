import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { saveManualPostFromKo } from "@/lib/admin-manual-post-service";

async function requireAdmin(request: Request) {
  const hasSession = await getAdminSessionFromCookies();
  if (!canAccessAdmin(request, hasSession) || !hasSession) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const result = await saveManualPostFromKo({
      titleKo: body.titleKo ?? "",
      descriptionKo: body.descriptionKo,
      bodyKo: body.bodyKo ?? "",
      tags: body.tags,
      shareTop: body.shareTop,
      shareBottom: body.shareBottom,
      coverImage: body.coverImage,
      coverImageAltKo: body.coverImageAltKo,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
