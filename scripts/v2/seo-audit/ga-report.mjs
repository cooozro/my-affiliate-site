/**
 * GA4 read-only helpers for SEO audit (isolated — does not modify admin-services).
 */

import crypto from "crypto";

async function getGoogleAccessToken(scopes) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const claim = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const unsigned = `${header}.${claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(creds.private_key).toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token ?? null;
}

export async function fetchGaTrafficSummary() {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;

  const token = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);
  if (!token) return null;

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      }),
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  const values = data.rows?.[0]?.metricValues;
  if (!values) return null;

  return {
    activeUsers7d: Number(values[0]?.value ?? 0),
    sessions7d: Number(values[1]?.value ?? 0),
    pageViews7d: Number(values[2]?.value ?? 0),
  };
}

/** Top blog landing paths (7d) — proxy for keyword/page correlation. */
export async function fetchGaTopBlogPages(limit = 8) {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return [];

  const token = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);
  if (!token) return [];

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "CONTAINS", value: "/blog/" },
          },
        },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit,
      }),
    },
  );

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "",
    views: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}
