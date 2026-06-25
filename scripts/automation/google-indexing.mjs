import { createSign } from "crypto";

const SCOPES = ["https://www.googleapis.com/auth/indexing"];

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON");
  }
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SCOPES.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function requestGoogleIndexing(url) {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_JSON not set — skip indexing API");
    return { skipped: true };
  }

  const token = await getAccessToken(serviceAccount);

  const response = await fetch(
    "https://indexing.googleapis.com/v3/urlNotifications:publish",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url,
        type: "URL_UPDATED",
      }),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Indexing API ${response.status}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text || "{}");
}

export async function requestSitemapPing() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";
  const sitemap = `${siteUrl}/sitemap.xml`;

  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`;
  const response = await fetch(pingUrl);

  console.log(`Sitemap ping: ${response.status}`);
  return response.status;
}
