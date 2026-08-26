/**
 * Serialize topic picks so two overlapping writes cannot claim the same aisle.
 */
import fs from "fs";
import path from "path";

const LOCK_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "write.lock",
);
const STALE_MS = 20 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStaleLock(lockPath) {
  try {
    const age = Date.now() - fs.statSync(lockPath).mtimeMs;
    return age > STALE_MS;
  } catch {
    return false;
  }
}

export async function acquireWriteLock(timeoutMs = 120_000) {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const fd = fs.openSync(LOCK_PATH, "wx");
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
      );
      fs.closeSync(fd);
      return () => {
        try {
          fs.unlinkSync(LOCK_PATH);
        } catch {
          // ignore
        }
      };
    } catch (err) {
      if (err?.code !== "EEXIST") throw err;
      if (isStaleLock(LOCK_PATH)) {
        try {
          fs.unlinkSync(LOCK_PATH);
        } catch {
          // ignore
        }
        continue;
      }
      await sleep(150);
    }
  }
  throw new Error("Could not acquire AIPICK write lock");
}
