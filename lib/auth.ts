import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'fallback-dev-secret-replace-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'LSFD2024!';

export function verifyPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(payload: string): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update(payload);
  const sig = hmac.digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifySession(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, sig] = parts;
  const expected = createHmac('sha256', SECRET)
    .update(Buffer.from(encodedPayload, 'base64url').toString())
    .digest('base64url');
  try {
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expectedBuf.length !== sigBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
    return Buffer.from(encodedPayload, 'base64url').toString();
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'lsfd_session';
export const SESSION_PAYLOAD = 'authenticated';
