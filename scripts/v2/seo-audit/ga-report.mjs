/**
 * GA4 read-only helpers for SEO audit (isolated — does not modify admin-services).
 */

import crypto from "crypto";

function kstLabel(iso) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function maskPropertyId(id) {
  if (!id || id.length < 4) return "(설정됨)";
  return `${id.slice(0, 2)}…${id.slice(-2)}`;
}

async function getGoogleAccessToken(scopes) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return { token: null, error: "GOOGLE_SERVICE_ACCOUNT_JSON 미설정" };
  }

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    return { token: null, error: "GOOGLE_SERVICE_ACCOUNT_JSON JSON 파싱 실패" };
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

  if (!response.ok) {
    const body = await response.text();
    return {
      token: null,
      error: `OAuth 토큰 실패 HTTP ${response.status}: ${body.slice(0, 120)}`,
    };
  }
  const data = await response.json();
  if (!data.access_token) {
    return { token: null, error: "OAuth 응답에 access_token 없음" };
  }
  return { token: data.access_token, serviceEmail: creds.client_email };
}

async function runGaReport(propertyId, token, body) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `GA4 API HTTP ${response.status}: ${text.slice(0, 200)}` };
  }

  return { ok: true, data: await response.json() };
}

export async function fetchGaTrafficSummary() {
  const bundle = await fetchGaReportBundle();
  return bundle.traffic;
}

export async function fetchGaTopBlogPages(limit = 8) {
  const bundle = await fetchGaReportBundle({ topPagesLimit: limit });
  return bundle.topPages;
}

/**
 * Full GA4 fetch with connection metadata for admin report.
 * @param {{ topPagesLimit?: number }} [options]
 */
export async function fetchGaReportBundle(options = {}) {
  const fetchedAt = new Date().toISOString();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() ?? "";
  const hasProperty = Boolean(propertyId);
  const hasServiceAccount = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());

  const meta = {
    fetchedAt,
    fetchedAtKst: kstLabel(fetchedAt),
    propertyIdMasked: hasProperty ? maskPropertyId(propertyId) : null,
    propertyConfigured: hasProperty,
    serviceAccountConfigured: hasServiceAccount,
    connected: false,
    dateRange: "7daysAgo ~ today (KST 기준 GA4 집계)",
    reportingLagNote:
      "GA4 Data API는 실시간 스트림이 아닙니다. 일반적으로 최근 24–48시간 데이터가 확정·반영됩니다. 아래 **수집 시각**은 API 조회 시각입니다.",
    error: null,
    serviceEmail: null,
  };

  if (!hasProperty) {
    meta.error = "GA4_PROPERTY_ID 미설정";
    return { traffic: null, topPages: [], meta };
  }
  if (!hasServiceAccount) {
    meta.error = "GOOGLE_SERVICE_ACCOUNT_JSON 미설정";
    return { traffic: null, topPages: [], meta };
  }

  const { token, error: tokenError, serviceEmail } = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);
  meta.serviceEmail = serviceEmail ?? null;

  if (!token) {
    meta.error = tokenError ?? "OAuth 토큰 획득 실패";
    return { traffic: null, topPages: [], meta };
  }

  const trafficResult = await runGaReport(propertyId, token, {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
  });

  if (!trafficResult.ok) {
    meta.error = trafficResult.error ?? "traffic report 실패";
    return { traffic: null, topPages: [], meta };
  }

  const values = trafficResult.data.rows?.[0]?.metricValues;
  const traffic = values
    ? {
        activeUsers7d: Number(values[0]?.value ?? 0),
        sessions7d: Number(values[1]?.value ?? 0),
        pageViews7d: Number(values[2]?.value ?? 0),
      }
    : {
        activeUsers7d: 0,
        sessions7d: 0,
        pageViews7d: 0,
      };

  const limit = options.topPagesLimit ?? 8;
  const pagesResult = await runGaReport(propertyId, token, {
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
  });

  const topPages = pagesResult.ok
    ? (pagesResult.data.rows ?? []).map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? "",
        views: Number(row.metricValues?.[0]?.value ?? 0),
      }))
    : [];

  meta.connected = true;
  meta.error = null;

  return { traffic, topPages, meta };
}
