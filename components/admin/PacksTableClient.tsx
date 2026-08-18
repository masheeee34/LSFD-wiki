'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { InterventionPack } from '@/types';

interface PacksTableClientProps {
  initialPacks: InterventionPack[];
}

export default function PacksTableClient({ initialPacks }: PacksTableClientProps) {
  const [packs, setPacks] = useState<InterventionPack[]>(initialPacks);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Confirmer la suppression définitive du pack « ${title} » ?`)) {
      return;
    }

    setDeletingId(id);
    // Optimistic UI update (0ms)
    setPacks(prev => prev.filter(p => p.id !== id));

    try {
      const res = await fetch(`/api/packs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      router.refresh();
    } catch {
      alert('Erreur lors de la suppression sur le serveur');
      // Revert if failed
      setPacks(initialPacks);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📑</span>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Packs d'Intervention & Classeurs Multi-Fiches ({packs.length})
            </h2>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '2px', margin: 0 }}>
            Regroupements thématiques affichés sur l'accueil avec barre d'onglets
          </p>
        </div>

        <Link
          href="/admin/packs/new"
          className="btn btn-secondary"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>+ Nouveau Pack</span>
        </Link>
      </div>

      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--color-bg-subtle)',
                borderBottom: '1px solid var(--color-border)',
                textAlign: 'left',
              }}>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '100px' }}>Code</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Titre du Pack</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '140px' }}>Fiches incluses</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '130px' }}>Alerte</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right', width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Aucun pack d'intervention créé pour le moment.
                  </td>
                </tr>
              ) : (
                packs.map(pack => (
                  <tr
                    key={pack.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 100ms ease',
                    }}
                    className="admin-table-row"
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-red)' }}>
                      {pack.code || 'PACK'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Link
                        href={`/packs/${pack.slug}`}
                        target="_blank"
                        style={{
                          color: 'var(--color-text-primary)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                        className="pack-title-link"
                      >
                        {pack.title} ↗
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        /{pack.slug}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <span className="badge badge-routine" style={{ fontSize: '10px' }}>
                        {pack.recordSlugs.length} protocoles
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {pack.badgeLabel ? (
                        <span className="badge badge-critical" style={{ fontSize: '9.5px' }}>
                          {pack.badgeLabel}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/admin/packs/edit/${pack.id}`}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            textDecoration: 'none',
                            fontSize: '11.5px',
                            fontWeight: 500,
                          }}
                          className="admin-edit-btn"
                        >
                          Éditer
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === pack.id}
                          onClick={() => handleDelete(pack.id, pack.title)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 500,
                          }}
                          className="admin-del-btn"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-table-row:hover {
          background-color: var(--color-bg-hover) !important;
        }
        .pack-title-link:hover {
          color: var(--color-brand-red) !important;
        }
      `}</style>
    </div>
  );
}
