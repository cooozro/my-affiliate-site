import { loadEnvFile } from "./load-env.mjs";

export function ensureImageApiEnv() {
  loadEnvFile();
}

export function hasImageApiKeys() {
  ensureImageApiEnv();
  return Boolean(
    process.env.PEXELS_API_KEY?.trim() ||
      process.env.PIXABAY_API_KEY?.trim() ||
      process.env.UNSPLASH_ACCESS_KEY?.trim() ||
      process.env.UNSPLASH_API_KEY?.trim(),
  );
}

/** How to get covers when local keys are missing (GitHub Secrets are not readable locally). */
export function printImageApiKeyHelp() {
  console.error(`
Image API keys are not set locally.

GitHub Secrets cannot be read from Cursor or your PC (by design). Options:

  A) Put keys in local .env (recommended for IDE writes)
     Copy the same values used on VPS (/root/blogger_automation/pexels_access_key.txt)
     and GitHub Actions Secrets into gitignored .env:
       PEXELS_API_KEY=...
       PIXABAY_API_KEY=...
       UNSPLASH_ACCESS_KEY=...
     Then: npm run content:image -- --slug=your-slug

  B) GHA (no local keys)
     1. Write the draft WITHOUT coverImage — never copy another post's cover.
     2. git push origin main
     3. GitHub Actions runs "Fetch missing draft covers" with repo Secrets.
     4. git pull — unique cover + frontmatter are committed by the bot.

     Manual trigger: GitHub → Actions → "Fetch missing draft covers" → Run workflow

Vercel env vars are for runtime/deploy — draft cover fetch runs in Node scripts / GHA.
`);
}
