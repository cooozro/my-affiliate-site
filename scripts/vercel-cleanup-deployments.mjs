#!/usr/bin/env node
/**
 * Free Hobby Deployment Storage by deleting old Vercel deployments.
 *
 * Requires: VERCEL_TOKEN (https://vercel.com/account/tokens)
 * Optional: VERCEL_TEAM_ID, VERCEL_PROJECTS, KEEP_PROD, KEEP_ANY, DRY_RUN=1
 *
 * Usage:
 *   export VERCEL_TOKEN=...
 *   npm run vercel:cleanup:dry   # list only
 *   npm run vercel:cleanup       # delete
 *
 * Safe defaults:
 *   - Keeps the newest KEEP_PROD (3) Ready production deployments
 *   - Keeps the newest KEEP_ANY (3) deployments of any kind
 *   - Keeps aliased production deployments
 *   - Deletes older Preview / Error / Canceled / superseded Production
 *   - Does NOT delete whole projects
 *
 * Biggest one-click win (dashboard): delete unused twin project
 * `my-affiliate-site-k7it` if it is not the live production site.
 */
const token = process.env.VERCEL_TOKEN?.trim();
if (!token) {
  console.error("Set VERCEL_TOKEN first (https://vercel.com/account/tokens)");
  process.exit(1);
}

const teamId = process.env.VERCEL_TEAM_ID?.trim();
const projects = (
  process.env.VERCEL_PROJECTS ||
  "my-affiliate-site,my-affiliate-site-k7it,selahim-platform"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const KEEP_PROD = Number(process.env.KEEP_PROD || 3);
const KEEP_ANY = Number(process.env.KEEP_ANY || 3);
const DRY_RUN = process.env.DRY_RUN === "1";

const api = (path, init = {}) => {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
};

async function listAllDeployments(projectId) {
  const out = [];
  let until;
  for (let i = 0; i < 50; i += 1) {
    const q = new URLSearchParams({
      projectId,
      limit: "100",
      ...(until ? { until: String(until) } : {}),
      ...(teamId ? { teamId } : {}),
    });
    const res = await fetch(`https://api.vercel.com/v6/deployments?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`list deployments ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const batch = data.deployments || [];
    out.push(...batch);
    if (!batch.length || !data.pagination?.next) break;
    until = data.pagination.next;
  }
  return out;
}

async function resolveProject(name) {
  const q = new URLSearchParams(teamId ? { teamId } : {});
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}?${q}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`project ${name}: ${res.status} ${await res.text()}`);
  return res.json();
}

function shouldKeep(d, keepIds) {
  return keepIds.has(d.uid || d.id);
}

async function main() {
  console.log(`DRY_RUN=${DRY_RUN ? "yes" : "no"} KEEP_PROD=${KEEP_PROD} KEEP_ANY=${KEEP_ANY}`);
  let deleted = 0;

  for (const name of projects) {
    const project = await resolveProject(name);
    if (!project) {
      console.log(`\n[skip] project not found: ${name}`);
      continue;
    }
    console.log(`\n=== ${name} (${project.id}) ===`);
    const deployments = await listAllDeployments(project.id);
    console.log(`found ${deployments.length} deployments`);

    const sorted = [...deployments].sort(
      (a, b) => (b.created || b.createdAt || 0) - (a.created || a.createdAt || 0),
    );

    const keepIds = new Set();
    const prod = sorted.filter(
      (d) =>
        d.target === "production" &&
        (d.readyState === "READY" || d.state === "READY"),
    );
    for (const d of prod.slice(0, KEEP_PROD)) {
      keepIds.add(d.uid);
    }
    for (const d of sorted.slice(0, KEEP_ANY)) {
      keepIds.add(d.uid);
    }
    for (const d of sorted) {
      if (Array.isArray(d.aliases) && d.aliases.length && d.target === "production") {
        keepIds.add(d.uid);
      }
    }

    const victims = sorted.filter((d) => !shouldKeep(d, keepIds));
    console.log(`keeping ${keepIds.size}, deleting ${victims.length}`);

    for (const d of victims) {
      const id = d.uid;
      const label = `${d.url || id} [${d.target || "?"}/${d.readyState || d.state}]`;
      if (DRY_RUN) {
        console.log(`  DRY  ${label}`);
        continue;
      }
      const res = await api(`/v13/deployments/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        console.warn(`  FAIL ${label}: ${res.status} ${(await res.text()).slice(0, 120)}`);
        continue;
      }
      deleted += 1;
      console.log(`  DEL  ${label}`);
      // gentle pacing for Hobby API limits
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  console.log(`\nDone. Deleted ${deleted} deployments.${DRY_RUN ? " (dry-run)" : ""}`);
  console.log(
    "Next (dashboard): each project → Settings → Deployment Retention → shortest (1 day if available).",
  );
  console.log(
    "Biggest free win: delete unused project my-affiliate-site-k7it entirely if it is not production.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
