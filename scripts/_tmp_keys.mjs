import { ensureImageApiEnv } from "./lib/image-api-env.mjs";
ensureImageApiEnv();
console.log({
  pexels: Boolean(process.env.PEXELS_API_KEY?.trim()),
  pixabay: Boolean(process.env.PIXABAY_API_KEY?.trim()),
  unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.UNSPLASH_API_KEY?.trim()),
});
