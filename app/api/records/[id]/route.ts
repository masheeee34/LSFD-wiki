import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as store from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import type { WikiRecord } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const record = await store.getById(id);
    if (!record) return NextResponse.json({ error: 'Fiche non trouvée' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error('GET record error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token || !verifySession(token)) {
      return NextResponse.json({ error: 'Session non autorisée ou expirée' }, { status: 401 });
    }
    const data = await req.json() as Partial<Omit<WikiRecord, 'id' | 'updatedAt'>>;
    const updated = await store.update(id, data);
    if (!updated) return NextResponse.json({ error: 'Fiche non trouvée' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT record error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token || !verifySession(token)) {
      return NextResponse.json({ error: 'Session non autorisée ou expirée. Veuillez vous reconnecter.' }, { status: 401 });
    }
    const removed = await store.remove(id);
    if (!removed) {
      return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE record error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 });
  }
}
