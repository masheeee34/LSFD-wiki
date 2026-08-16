import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'lsfd_session';

// Edge-compatible HMAC verification using Web Crypto API
async function verifyEdgeSession(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET ?? 'fallback-dev-secret-replace-me';
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encodedPayload, sig] = parts;

  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const payload = Uint8Array.from(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBytes, payload);
  } catch {
    return false;
  }
}

// In-Memory Rate Limiter (Token Bucket / Sliding Window)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // 1. Rate Limiting on Auth & API Routes
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/records')) {
    const limit = pathname.startsWith('/api/auth') ? 10 : 120; // 10 attempts/min on auth, 120/min on API
    const windowMs = 60 * 1000;
    const key = `${ip}:${pathname.startsWith('/api/auth') ? 'auth' : 'api'}`;

    if (isRateLimited(key, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: 'Trop de requêtes. Veuillez patienter avant de réessayer.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
  }

  // 2. Strict /admin Route Protection
  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const valid = await verifyEdgeSession(token);
    if (!valid) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin', '/api/:path*'],
};
