import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import {
  getAdminPostContentBundle,
  saveAdminPostContent,
} from "@/lib/admin-actions";
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
  const format = new URL(request.url).searchParams.get("format") ?? "bundle";

  try {
    const bundle = await getAdminPostContentBundle(slug, locale);
    if (format === "html") {
      return NextResponse.json({ html: bundle.html, title: bundle.title });
    }
    if (format === "markdown") {
      return NextResponse.json({ text: bundle.markdown });
    }
    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = (await request.json()) as {
    locale?: string;
    mode?: "markdown" | "html";
    markdown?: string;
    html?: string;
  };
  const locale =
    body.locale && isValidLocale(body.locale) ? body.locale : "ko";

  try {
    const result = await saveAdminPostContent(slug, locale, {
      mode: body.mode,
      markdown: body.markdown,
      html: body.html,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
