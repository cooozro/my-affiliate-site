#!/usr/bin/env node
/** POST to Vercel deploy hook when VERCEL_DEPLOY_HOOK is set. */
const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
if (!hook) {
  console.log("VERCEL_DEPLOY_HOOK not set — skip redeploy");
  process.exit(0);
}

const response = await fetch(hook, { method: "POST" });
const body = await response.text();
console.log(`Vercel deploy hook: HTTP ${response.status} ${body.slice(0, 120)}`);
if (!response.ok) {
  console.warn(`Vercel deploy hook failed (non-fatal): HTTP ${response.status}`);
  process.exit(0);
}
