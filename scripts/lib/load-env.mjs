/**
 * Load .env from project root into process.env (does not override existing env).
 */
import fs from "fs";
import path from "path";

let loaded = false;

function applyEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadEnvFile(root = process.cwd()) {
  if (loaded) return;

  // .env then .env.local (first wins — do not override shell env)
  applyEnvFile(path.join(root, ".env"));
  applyEnvFile(path.join(root, ".env.local"));

  loaded = true;
  logSearchEnvStatus();
}

/** Debug: GA4 env presence (secrets masked). */
export function logGa4EnvStatus() {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() ?? "";
  const hasJson = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
  console.log(
    "[load-env] GA4_PROPERTY_ID:",
    propertyId ? maskSecret(propertyId) : "(missing)",
  );
  console.log(
    "[load-env] GOOGLE_SERVICE_ACCOUNT_JSON:",
    hasJson ? "(set)" : "(missing)",
  );
}

function maskSecret(value, visible = 4) {
  if (!value) return "(empty)";
  if (value.length <= visible * 2) return "*".repeat(value.length);
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

/** Debug: confirm SERP env vars loaded from .env (secrets masked). */
export function logSearchEnvStatus() {
  const provider = process.env.SERP_PROVIDER?.trim() || "serper";
  const serperKey = process.env.SERPER_API_KEY?.trim() ?? "";

  console.log("[load-env] SERP_PROVIDER:", provider);
  console.log("[load-env] SERPER_API_KEY:", serperKey ? maskSecret(serperKey) : "(missing)");
}
