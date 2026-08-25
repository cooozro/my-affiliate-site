import { NextResponse } from "next/server";

import { canAccessAdmin, getAdminSessionFromCookies } from "@/lib/admin-auth";
import { dispatchPublishSlotWorkflow } from "@/lib/admin-services";
import { tryReadGithubJson } from "@/lib/admin-services";

async function requireAdmin(request: Request) {
  const hasSession = await getAdminSessionFromCookies();
  if (!canAccessAdmin(request, hasSession) || !hasSession) {
    return false;
  }
  return true;
}

async function isSchedulerPaused(): Promise<boolean> {
  if (process.env.AIPICK_SCHEDULER_PAUSED === "true") return true;
  const remote = await tryReadGithubJson("data/automation/state.json");
  if (remote?.schedulerPaused === true) return true;
  return false;
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (await isSchedulerPaused()) {
    return NextResponse.json(
      { ok: false, error: "Scheduler is paused" },
      { status: 409 },
    );
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
