import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword, signSession, SESSION_COOKIE, SESSION_PAYLOAD } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json() as { password?: string };
  const password = body?.password ?? '';

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = signSession(SESSION_PAYLOAD);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 28800,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
