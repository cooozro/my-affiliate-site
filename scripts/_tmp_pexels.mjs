import { ensureImageApiEnv } from "./lib/image-api-env.mjs";
ensureImageApiEnv();
const key = process.env.PEXELS_API_KEY?.trim();
const url = "https://api.pexels.com/v1/search?query=dehumidifier&per_page=10";
const data = await (await fetch(url, { headers: { Authorization: key } })).json();
console.log("total", data.total_results, "photos", data.photos?.length);
for (const p of (data.photos ?? []).slice(0, 5)) {
  console.log(p.id, JSON.stringify(p.alt)?.slice(0, 100));
}
