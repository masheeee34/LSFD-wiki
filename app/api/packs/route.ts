import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPacks, createPack } from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const packs = await getPacks();
  return NextResponse.json(packs, {
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, slug, code, description, badgeLabel, recordSlugs } = body;

    if (!title || !slug || !Array.isArray(recordSlugs)) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }

    const created = await createPack({
      title,
      slug,
      code: code || 'PACK',
      description: description || '',
      badgeLabel: badgeLabel || undefined,
      recordSlugs,
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la création du pack' }, { status: 500 });
  }
}
