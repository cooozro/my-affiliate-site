import { NextResponse } from "next/server";
import {
  canAccessAdmin,
  getAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { getAdminAnalytics, getAdminPosts } from "@/lib/admin-actions";

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

  const [posts, analytics] = await Promise.all([
    getAdminPosts(),
    getAdminAnalytics(),
  ]);

  return NextResponse.json({ posts, analytics });
}
