import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { getPostCopyMarkdown } from "@/lib/admin-actions";
import { isValidLocale } from "@/lib/i18n/config";

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
  const localeParam = new URL(request.url).searchParams.get("locale");
  const locale = localeParam && isValidLocale(localeParam) ? localeParam : "ko";

  try {
    const text = await getPostCopyMarkdown(slug, locale);
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Copy failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
