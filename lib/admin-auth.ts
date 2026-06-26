import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") {
    return "dev-admin-local-only";
  }
  return null;
}

export function isAdminConfigured(): boolean {
  return getAdminSecret() !== null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionToken(): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const issuedAt = Date.now().toString();
  const payload = `admin:${issuedAt}`;
  const signature = signPayload(payload, secret);
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret || !token) return false;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }

  if (!payload.startsWith("admin:")) return false;

  const expected = signPayload(payload, secret);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isLoopbackIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("127.")
  );
}

export function isLocalAdminRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return isLoopbackIp(getClientIp(request));
}

export function isIpAllowlisted(request: Request): boolean {
  const allowed = process.env.ADMIN_ALLOWED_IPS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowed?.length) return false;
  return allowed.includes(getClientIp(request));
}

export function canAccessAdmin(
  request: Request,
  hasValidSession: boolean,
): boolean {
  if (!isAdminConfigured()) return false;
  if (process.env.NODE_ENV === "development") return true;
  if (hasValidSession) return true;
  if (isLocalAdminRequest(request)) return true;
  if (isIpAllowlisted(request)) return true;
  return false;
}

export async function getAdminSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export function adminSessionCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;

  const hash = (value: string) =>
    createHmac("sha256", "admin-password-check").update(value).digest();

  try {
    return timingSafeEqual(hash(password), hash(secret));
  } catch {
    return false;
  }
}
