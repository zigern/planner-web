import type { NextRequest, NextResponse } from "next/server";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function getExpectedOrigin(request: NextRequest): string | null {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return normalizeOrigin(`${proto}://${host}`);
}

function getExtraAllowedOrigins(): string[] {
  const raw = process.env.APP_ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
}

export function isMutatingMethod(method: string) {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function isTrustedOrigin(request: NextRequest) {
  if (!isMutatingMethod(request.method)) return true;

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const incomingOrigin = normalizeOrigin(originHeader) || normalizeOrigin(refererHeader);
  if (!incomingOrigin) return false;

  const expectedOrigin = getExpectedOrigin(request);
  const allowed = new Set<string>([
    ...getExtraAllowedOrigins(),
    ...(expectedOrigin ? [expectedOrigin] : [])
  ]);

  return allowed.has(incomingOrigin);
}

export function getClientIdentifier(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}
