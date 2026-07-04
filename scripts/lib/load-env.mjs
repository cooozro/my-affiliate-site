/**
 * Load .env from project root into process.env (does not override existing env).
 */
import fs from "fs";
import path from "path";

let loaded = false;

export function loadEnvFile(root = process.cwd()) {
  if (loaded) return;

  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    loaded = true;
    return;
  }

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

  loaded = true;
  logSearchEnvStatus();
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
