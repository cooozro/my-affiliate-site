import { loadEnvFile } from "./load-env.mjs";

export function ensureImageApiEnv() {
  loadEnvFile();
}

export function hasImageApiKeys() {
  ensureImageApiEnv();
  return Boolean(
    process.env.PEXELS_API_KEY?.trim() || process.env.PIXABAY_API_KEY?.trim(),
  );
}

/** How to get covers when local keys are missing (GitHub Secrets are not readable locally). */
export function printImageApiKeyHelp() {
  console.error(`
Image API keys are not set locally.

GitHub Secrets cannot be read from Cursor or your PC (by design). Options:

  A) GHA (recommended for IDE replenish, no local keys)
     1. Write the draft WITHOUT coverImage — never copy another post's cover.
     2. git push origin main
     3. GitHub Actions runs "Fetch missing draft covers" with repo Secrets.
     4. git pull — unique cover + frontmatter are committed by the bot.
     5. Run integrity, then mark cursor-draft-request complete.

     Manual trigger: GitHub → Actions → "Fetch missing draft covers" → Run workflow

  B) Local keys (one-time copy from GitHub Settings → Secrets)
     Add to .env (gitignored, same values as repo Secrets):
       PEXELS_API_KEY=...
       PIXABAY_API_KEY=...
     Then: npm run content:image -- --slug=your-slug

Duplicate heroes are blocked by contentHash; copying files will fail integrity.
`);
}
