import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as store from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import type { WikiRecord } from '@/types';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q');
  if (q) {
    return NextResponse.json(await store.search(q));
  }
  return NextResponse.json(await store.getAll());
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await req.json() as Omit<WikiRecord, 'id' | 'updatedAt'>;
  const record = await store.create(data);
  return NextResponse.json(record, { status: 201 });
}
