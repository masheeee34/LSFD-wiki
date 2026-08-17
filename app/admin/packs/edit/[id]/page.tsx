import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getPackById, getAll } from '@/lib/store';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import EditPackClient from './EditPackClient';

export const dynamic = 'force-dynamic';

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const pack = await getPackById(id);
  if (!pack) {
    notFound();
  }

  const allRecords = await getAll();

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', paddingBottom: '48px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '13px' }} className="back-crumb">
            ← Retour à l'administration
          </Link>
          <span style={{ color: 'var(--color-text-muted)' }}>/</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '13px' }}>
            Modifier Pack ({pack.code})
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Éditer le Pack : {pack.title}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
          Modifiez le titre, l'ordre des fiches ou les métadonnées du pack.
        </p>
      </div>

      <EditPackClient pack={pack} allRecords={allRecords} />

      <style>{`
        .back-crumb:hover {
          color: var(--color-text-primary) !important;
        }
      `}</style>
    </div>
  );
}
