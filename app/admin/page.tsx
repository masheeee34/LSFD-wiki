import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getAll, remove } from '@/lib/store';
import { SESSION_COOKIE } from '@/lib/auth';
import type { RecordCategory } from '@/types';

export const metadata = { title: 'Administration — LSFD Medilog' };

const CATEGORY_STYLES: Record<RecordCategory, { label: string; bg: string; text: string; border: string }> = {
  protocol: {
    label: 'Protocole',
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.25)',
  },
  medication: {
    label: 'Pharmacologie',
    bg: 'rgba(6, 182, 212, 0.1)',
    text: '#22d3ee',
    border: 'rgba(6, 182, 212, 0.25)',
  },
  maneuver: {
    label: 'Manœuvre',
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  equipment: {
    label: 'Matériel',
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#4ade80',
    border: 'rgba(34, 197, 94, 0.25)',
  },
};

const SEVERITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: {
    label: 'Critique',
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#f87171',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  urgent: {
    label: 'Urgent',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  routine: {
    label: 'Routine',
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.25)',
  },
};

export default async function AdminPage() {
  const records = await getAll();

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

  async function deleteRecord(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    if (id) {
      await remove(id);
      revalidatePath('/');
      revalidatePath('/admin');
    }
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', paddingBottom: '48px' }}>
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
            {records.length} fiches répertoriées · Base de données locale LSFD
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link
            href="/admin/new"
            style={{
              textDecoration: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-brand-red)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 120ms ease',
            }}
            className="btn-new-fiche"
          >
            + Nouvelle fiche
          </Link>
          <form action={logout} style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              className="btn-logout"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '18px',
      }}>
        {(Object.entries(counts) as [RecordCategory, number][]).map(([cat, count]) => {
          const style = CATEGORY_STYLES[cat];
          return (
            <div key={cat} className="linear-card" style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                {style.label}
              </span>
              <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: style.text }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Registry Table Container */}
      <div
        className="linear-card"
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-surface)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                background: 'var(--color-bg-subtle)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <th style={{ padding: '12px 18px', width: '130px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Catégorie
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Intitulé
                </th>
                <th style={{ padding: '12px 18px', width: '110px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sévérité
                </th>
                <th style={{ padding: '12px 18px', width: '120px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mise à jour
                </th>
                <th style={{ padding: '12px 18px', width: '160px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const catStyle = CATEGORY_STYLES[record.category] || CATEGORY_STYLES.protocol;
                const sevStyle = record.severity ? SEVERITY_STYLES[record.severity] : null;

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 100ms ease',
                    }}
                    className="admin-table-row"
                  >
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`,
                      }}>
                        {catStyle.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <Link
                        href={`/records/${record.slug}`}
                        target="_blank"
                        style={{
                          color: 'var(--color-text-primary)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '13.5px',
                          letterSpacing: '-0.01em',
                          display: 'inline-block',
                        }}
                        className="admin-title-link"
                      >
                        {record.title}
                      </Link>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        /{record.slug}
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      {sevStyle ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.text,
                          border: `1px solid ${sevStyle.border}`,
                        }}>
                          {sevStyle.label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(record.updatedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <Link
                          href={`/admin/edit/${record.id}`}
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            transition: 'all 120ms ease',
                          }}
                          className="btn-edit-action"
                        >
                          Éditer
                        </Link>
                        <form action={deleteRecord} style={{ margin: 0 }}>
                          <input type="hidden" name="id" value={record.id} />
                          <button
                            type="submit"
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#f87171',
                              backgroundColor: 'transparent',
                              border: '1px solid transparent',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                            }}
                            className="btn-delete-action"
                          >
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .btn-new-fiche:hover {
          opacity: 0.9;
        }
        .btn-logout:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .admin-table-row:hover {
          background-color: var(--color-bg-hover) !important;
        }
        .admin-title-link:hover {
          color: var(--color-brand-red) !important;
        }
        .btn-edit-action:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
          border-color: var(--color-border-hover) !important;
        }
        .btn-delete-action:hover {
          color: #ef4444 !important;
          background-color: rgba(239, 68, 68, 0.1) !important;
          border-color: rgba(239, 68, 68, 0.25) !important;
        }
      `}</style>
    </div>
  );
}
