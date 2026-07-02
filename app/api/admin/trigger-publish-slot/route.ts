import { NextResponse } from "next/server";

import { canAccessAdmin, getAdminSessionFromCookies } from "@/lib/admin-auth";
import { dispatchPublishSlotWorkflow } from "@/lib/admin-services";

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

  const result = await dispatchPublishSlotWorkflow();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "dispatch failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
