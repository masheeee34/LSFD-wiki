import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as store from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import type { WikiRecord } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q');
    if (q) {
      return NextResponse.json(await store.search(q));
    }
    return NextResponse.json(await store.getAll());
  } catch (error) {
    console.error('GET records error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token || !verifySession(token)) {
      return NextResponse.json({ error: 'Session non autorisée ou expirée' }, { status: 401 });
    }
    const data = await req.json() as Omit<WikiRecord, 'id' | 'updatedAt'>;
    const record = await store.create(data);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('POST record error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la fiche' }, { status: 500 });
  }
}
