import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAll, getPacks } from '@/lib/store';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import AdminTableClient from '@/components/admin/AdminTableClient';
import PacksTableClient from '@/components/admin/PacksTableClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Administration — LSFD Medilog' };

export default async function AdminPage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !verifySession(token)) {
    redirect('/admin/login');
  }

  const [records, packs] = await Promise.all([getAll(), getPacks()]);

  const counts = {
    protocol: records.filter(r => r.category === 'protocol').length,
    medication: records.filter(r => r.category === 'medication').length,
    maneuver: records.filter(r => r.category === 'maneuver').length,
    equipment: records.filter(r => r.category === 'equipment').length,
  };

  async function logout() {
    'use server';
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    redirect('/admin/login');
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '24px 16px 48px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Administration du référentiel médical
            </h1>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}>
              Session active
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', marginTop: '4px', margin: 0 }}>
            {records.length} fiches répertoriées · {packs.length} packs d'intervention · Base active LSFD
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Bouton de renvoi vers l'index */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'all 120ms ease',
            }}
            className="btn-back-home"
          >
            <span>←</span>
            <span>Retour au portail</span>
          </Link>

          <Link
            href="/admin/packs/new"
            className="btn btn-secondary"
            style={{
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            + Nouveau pack
          </Link>

          <Link
            href="/admin/new"
            className="btn btn-primary"
            style={{
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            + Nouvelle fiche
          </Link>

          <form action={logout} style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 120ms ease',
              }}
              className="btn-logout"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {/* Category Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }} className="admin-stats-grid">
        {[
          { label: 'Protocoles', count: counts.protocol, color: 'var(--color-cat-protocol-text)', href: '/search?category=protocol' },
          { label: 'Pharmacologie', count: counts.medication, color: 'var(--color-cat-med-text)', href: '/search?category=medication' },
          { label: 'Manœuvres', count: counts.maneuver, color: 'var(--color-cat-maneuver-text)', href: '/search?category=maneuver' },
          { label: 'Matériel', count: counts.equipment, color: 'var(--color-cat-equip-text)', href: '/search?category=equipment' },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'all 120ms ease',
            }}
            className="stat-card"
          >
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: item.color, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {item.count}
              </div>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--color-text-faint)' }}>→</span>
          </Link>
        ))}
      </div>

      {/* Reactive Client Admin Table with Instant UI update */}
      <AdminTableClient initialRecords={records} />

      {/* Reactive Packs Table */}
      <PacksTableClient initialPacks={packs} />

      <style>{`
        .btn-back-home:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border-hover) !important;
        }
        .btn-logout:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .stat-card:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        @media (max-width: 768px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
