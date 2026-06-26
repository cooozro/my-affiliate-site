import { NextResponse } from "next/server";
import {
  adminSessionCookieOptions,
  clearAdminSessionCookieOptions,
  createAdminSessionToken,
  getAdminSessionFromCookies,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function GET() {
  const hasSession = await getAdminSessionFromCookies();
  return NextResponse.json({ ok: hasSession });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim() ?? "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Admin is not configured (set ADMIN_SECRET)" },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookieOptions(token));
  return response;
}

export async function DELETE() {
  const hasSession = await getAdminSessionFromCookies();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearAdminSessionCookieOptions());
  return response;
}
