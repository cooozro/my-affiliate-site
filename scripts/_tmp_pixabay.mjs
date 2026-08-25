import { ensureImageApiEnv } from "./lib/image-api-env.mjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

ensureImageApiEnv();
const apiKey = process.env.PIXABAY_API_KEY?.trim();
const root = process.cwd();
const guideHashPath = path.join(
  root,
  "public/images/posts/2026-dehumidifiers-guide/home-dehumidifier-room-dehumidifier-appliance-cover.jpg",
);
const guideHash = fs.existsSync(guideHashPath)
  ? crypto.createHash("sha256").update(fs.readFileSync(guideHashPath)).digest("hex").slice(0, 12)
  : "none";

const url = new URL("https://pixabay.com/api/");
url.searchParams.set("key", apiKey);
url.searchParams.set("q", "dehumidifier");
url.searchParams.set("image_type", "photo");
url.searchParams.set("per_page", "20");
const data = await (await fetch(url)).json();
console.log("guideHash", guideHash, "hits", data.hits?.length);
for (const hit of (data.hits ?? []).slice(0, 8)) {
  console.log(hit.id, hit.tags?.slice(0, 80));
}
