const DEFAULT_KEY = "aipickindexnow2026";

/** IndexNow endpoints — each search engine receives the submission directly. */
export const INDEXNOW_ENDPOINTS = [
  { id: "indexnow-global", url: "https://api.indexnow.org/indexnow" },
  { id: "indexnow-naver", url: "https://searchadvisor.naver.com/indexnow" },
  { id: "indexnow-bing", url: "https://www.bing.com/indexnow" },
];

export function getIndexNowKey() {
  return process.env.INDEXNOW_KEY?.trim() || DEFAULT_KEY;
}

export function getIndexNowKeyLocation(siteUrl) {
  const key = getIndexNowKey();
  return `${siteUrl.replace(/\/$/, "")}/${key}.txt`;
}

function buildIndexNowBody(siteUrl, urlList) {
  const host = new URL(siteUrl).hostname;
  const key = getIndexNowKey();
  const keyLocation = getIndexNowKeyLocation(siteUrl);
  return { host, key, keyLocation, urlList };
}

async function postToEndpoint(endpoint, body) {
  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const ok = response.status === 200 || response.status === 202;
  return {
    channel: endpoint.id,
    ok,
    status: response.status,
    urlCount: body.urlList.length,
    error: ok ? undefined : text.slice(0, 200),
  };
}

/**
 * Submit URLs to a single IndexNow endpoint (legacy helper).
 */
export async function submitIndexNow(urls, options = {}) {
  const siteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";
  const urlList = [...new Set(urls)].filter(Boolean);
  if (urlList.length === 0) {
    return { skipped: true, reason: "no-urls" };
  }

  const result = await postToEndpoint(
    INDEXNOW_ENDPOINTS[0],
    buildIndexNowBody(siteUrl, urlList),
  );
  if (!result.ok) {
    throw new Error(`IndexNow ${result.status}: ${result.error}`);
  }
  console.log(`IndexNow global: ${urlList.length} URL(s) (${result.status})`);
  return { ok: true, status: result.status, urlCount: urlList.length };
}

/**
 * Fan-out to global, Naver, and Bing IndexNow endpoints in parallel.
 * @param {string[]} urls
 * @param {{ siteUrl?: string, endpoints?: typeof INDEXNOW_ENDPOINTS }} [options]
 */
export async function submitIndexNowAll(urls, options = {}) {
  const siteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";
  const urlList = [...new Set(urls)].filter(Boolean);
  if (urlList.length === 0) {
    return [{ channel: "indexnow", ok: false, skipped: true, error: "no-urls" }];
  }

  const endpoints = options.endpoints ?? INDEXNOW_ENDPOINTS;
  const body = buildIndexNowBody(siteUrl, urlList);

  const settled = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const result = await postToEndpoint(endpoint, body);
        if (result.ok) {
          console.log(
            `${endpoint.id}: ${urlList.length} URL(s) (${result.status})`,
          );
        } else {
          console.warn(`${endpoint.id} failed: ${result.status} ${result.error}`);
        }
        return result;
      } catch (error) {
        console.warn(`${endpoint.id} error: ${error.message}`);
        return {
          channel: endpoint.id,
          ok: false,
          error: error.message,
        };
      }
    }),
  );

  return settled;
}
