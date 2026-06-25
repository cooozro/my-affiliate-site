import fs from "fs";
import path from "path";

export async function fetchCoverImage(slug, query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY not set — skipping cover image");
    return null;
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Pexels API ${response.status}`);
  }

  const data = await response.json();
  const photo = data.photos?.[0];
  if (!photo) return null;

  const imageUrl = photo.src.large2x || photo.src.large;
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error("Image download failed");

  const relativePath = `/images/posts/${slug}/cover.jpg`;
  const destPath = path.join(process.cwd(), "public", "images", "posts", slug, "cover.jpg");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await imageResponse.arrayBuffer()));

  return {
    coverImage: relativePath,
    coverImageAlt: query,
    coverImageCredit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
  };
}
