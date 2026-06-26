const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_KEY = "aipickindexnow2026";

export function getIndexNowKey() {
  return process.env.INDEXNOW_KEY?.trim() || DEFAULT_KEY;
}

export function getIndexNowKeyLocation(siteUrl) {
  const key = getIndexNowKey();
  return `${siteUrl.replace(/\/$/, "")}/${key}.txt`;
}

export async function submitIndexNow(urls, options = {}) {
  const siteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";
  const host = new URL(siteUrl).hostname;
  const key = getIndexNowKey();
  const keyLocation = getIndexNowKeyLocation(siteUrl);
  const urlList = [...new Set(urls)].filter(Boolean);

  if (urlList.length === 0) {
    return { skipped: true, reason: "no-urls" };
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  });

  const text = await response.text();

  if (response.status === 200 || response.status === 202) {
    console.log(`IndexNow: submitted ${urlList.length} URL(s) (${response.status})`);
    return { ok: true, status: response.status, urlCount: urlList.length };
  }

  throw new Error(`IndexNow ${response.status}: ${text.slice(0, 200)}`);
}
