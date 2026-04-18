import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders, getClientIdentifier, isMutatingMethod, isTrustedOrigin } from "@/lib/security/http";
import { consumeRateLimit } from "@/lib/security/rate-limit";

function withSecurity(response: NextResponse) {
  applySecurityHeaders(response);
  return response;
}

function deny(message: string, status = 403) {
  return withSecurity(NextResponse.json({ error: message }, { status }));
}

function enforceRateLimit(request: NextRequest, key: string, max: number, windowMs: number) {
  const client = getClientIdentifier(request);
  const result = consumeRateLimit(`${key}:${client}`, max, windowMs);
  if (!result.allowed) {
    const response = deny("Too many requests. Please try again in a few minutes.", 429);
    response.headers.set("Retry-After", String(result.retryAfterSec));
    return response;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && isMutatingMethod(request.method) && !isTrustedOrigin(request)) {
    return deny("Invalid request origin.");
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const limited = enforceRateLimit(request, "auth-login", 8, 10 * 60 * 1000);
    if (limited) return limited;
  }

  if (pathname === "/api/auth/register" && request.method === "POST") {
    const limited = enforceRateLimit(request, "auth-register", 5, 30 * 60 * 1000);
    if (limited) return limited;
  }

  if (pathname === "/api/auth/profile" && request.method === "PATCH") {
    const limited = enforceRateLimit(request, "auth-profile", 12, 10 * 60 * 1000);
    if (limited) return limited;
  }

  if (pathname === "/api/bank/connect" && request.method === "POST") {
    const limited = enforceRateLimit(request, "bank-connect", 8, 10 * 60 * 1000);
    if (limited) return limited;
  }

  if (pathname === "/api/bank/sync" && request.method === "POST") {
    const limited = enforceRateLimit(request, "bank-sync", 30, 10 * 60 * 1000);
    if (limited) return limited;
  }

  if (pathname === "/api/bank/disconnect" && request.method === "POST") {
    const limited = enforceRateLimit(request, "bank-disconnect", 20, 10 * 60 * 1000);
    if (limited) return limited;
  }

  return withSecurity(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
