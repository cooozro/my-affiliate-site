import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { getAdminAnalytics, getAdminAutomationStatus, getAdminPosts } from "@/lib/admin-actions";

async function requireAdmin(request: Request) {
  const hasSession = await getAdminSessionFromCookies();
  if (!canAccessAdmin(request, hasSession) || !hasSession) {
    return null;
  }
  return true;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [posts, analytics, automation] = await Promise.all([
      getAdminPosts(),
      getAdminAnalytics(),
      Promise.resolve(getAdminAutomationStatus()),
    ]);

    return NextResponse.json({ posts, analytics, automation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin posts API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
