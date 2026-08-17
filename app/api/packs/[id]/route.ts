import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPackById, updatePack, removePack } from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackById(id);
  if (!pack) {
    return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });
  }
  return NextResponse.json(pack);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await updatePack(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await removePack(id);
  return NextResponse.json({ ok });
}
