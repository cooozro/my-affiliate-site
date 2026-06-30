import "server-only";

import { createSign } from "crypto";

const GITHUB_API = "https://api.github.com";

function getRepo(): string {
  return process.env.GITHUB_REPO?.trim() ?? "cooozro/my-affiliate-site";
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for admin post changes on Vercel");
  }
  return token;
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API}/repos/${getRepo()}/contents/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2023-11-29",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function readGithubFile(path: string): Promise<{
  content: string;
  sha: string;
}> {
  const data = (await githubRequest(path)) as {
    content: string;
    sha: string;
  };
  return {
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha,
  };
}

export async function writeGithubFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
) {
  await githubRequest(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function deleteGithubFile(
  path: string,
  sha: string,
  message: string,
) {
  await githubRequest(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha }),
  });
}

type GithubContentEntry = {
  path: string;
  sha: string;
  type: "file" | "dir" | "submodule" | "symlink";
};

export async function listGithubDirectory(
  dirPath: string,
): Promise<GithubContentEntry[]> {
  const data = await githubRequest(dirPath);
  if (!Array.isArray(data)) return [];
  return data as GithubContentEntry[];
}

async function safeDeleteGithubFile(filePath: string, message: string) {
  try {
    const existing = await readGithubFile(filePath);
    await deleteGithubFile(filePath, existing.sha, message);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("404")) return;
    throw error;
  }
}

async function deleteGithubDirectory(dirPath: string, message: string) {
  let entries: GithubContentEntry[];
  try {
    entries = await listGithubDirectory(dirPath);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("404")) return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.type === "file") {
      await deleteGithubFile(entry.path, entry.sha, message);
    } else if (entry.type === "dir") {
      await deleteGithubDirectory(entry.path, message);
    }
  }
}

export async function commitPostChanges(
  slug: string,
  message: string,
  mutate: (
    locale: "en" | "ko",
    data: Record<string, unknown>,
    content: string,
  ) => { data: Record<string, unknown>; content: string },
) {
  const matter = await import("gray-matter");

  for (const locale of ["en", "ko"] as const) {
    const filePath = `content/posts/${slug}/${locale}.md`;
    try {
      const existing = await readGithubFile(filePath);
      const parsed = matter.default(existing.content);
      const next = mutate(
        locale,
        parsed.data as Record<string, unknown>,
        parsed.content.trim(),
      );
      const serialized = matter.default.stringify(next.content, next.data);
      await writeGithubFile(
        filePath,
        serialized,
        `${message} (${locale})`,
        existing.sha,
      );
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      if (messageText.includes("404")) continue;
      throw error;
    }
  }
}

export async function deletePostOnGithub(slug: string) {
  const message = `admin: delete ${slug}`;

  for (const locale of ["en", "ko"] as const) {
    await safeDeleteGithubFile(`content/posts/${slug}/${locale}.md`, `${message} (${locale})`);
  }

  await deleteGithubDirectory(`public/images/posts/${slug}`, `${message} (images)`);
}

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };
  } catch {
    return null;
  }
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken(scopes: string[]) {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: scopes.join(" "),
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

  if (!response.ok) return null;
  const data = (await response.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export type GaSummary = {
  activeUsers7d: number;
  sessions7d: number;
  pageViews7d: number;
  activeUsers28d: number;
};

export async function fetchGaSummary(): Promise<GaSummary | null> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;

  const token = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);
  if (!token) return null;

  async function runReport(body: Record<string, unknown>) {
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
    if (!response.ok) return null;
    return response.json() as Promise<{
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    }>;
  }

  const week = await runReport({
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
  });

  const month = await runReport({
    dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
    metrics: [{ name: "activeUsers" }],
  });

  if (!week?.rows?.[0]?.metricValues) return null;

  const weekValues = week.rows[0].metricValues;
  return {
    activeUsers7d: Number(weekValues[0]?.value ?? 0),
    sessions7d: Number(weekValues[1]?.value ?? 0),
    pageViews7d: Number(weekValues[2]?.value ?? 0),
    activeUsers28d: Number(month?.rows?.[0]?.metricValues?.[0]?.value ?? 0),
  };
}
