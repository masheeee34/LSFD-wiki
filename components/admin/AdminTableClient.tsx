'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WikiRecord, RecordCategory } from '@/types';

interface Props {
  initialRecords: WikiRecord[];
}

const CATEGORY_STYLES: Record<RecordCategory, { label: string; bg: string; text: string; border: string }> = {
  protocol: {
    label: 'Protocole',
    bg: 'var(--color-cat-protocol-bg)',
    text: 'var(--color-cat-protocol-text)',
    border: 'var(--color-cat-protocol-border)',
  },
  medication: {
    label: 'Pharmacologie',
    bg: 'var(--color-cat-med-bg)',
    text: 'var(--color-cat-med-text)',
    border: 'var(--color-cat-med-border)',
  },
  maneuver: {
    label: 'Manœuvre',
    bg: 'var(--color-cat-maneuver-bg)',
    text: 'var(--color-cat-maneuver-text)',
    border: 'var(--color-cat-maneuver-border)',
  },
  equipment: {
    label: 'Matériel',
    bg: 'var(--color-cat-equip-bg)',
    text: 'var(--color-cat-equip-text)',
    border: 'var(--color-cat-equip-border)',
  },
};

const SEVERITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: {
    label: 'Critique',
    bg: 'var(--badge-crit-bg)',
    text: 'var(--badge-crit-text)',
    border: 'var(--badge-crit-border)',
  },
  urgent: {
    label: 'Urgent',
    bg: 'var(--badge-urgent-bg)',
    text: 'var(--badge-urgent-text)',
    border: 'var(--badge-urgent-border)',
  },
  routine: {
    label: 'Routine',
    bg: 'var(--badge-routine-bg)',
    text: 'var(--badge-routine-text)',
    border: 'var(--badge-routine-border)',
  },
};

export default function AdminTableClient({ initialRecords }: Props) {
  const [records, setRecords] = useState<WikiRecord[]>(initialRecords);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la fiche "${title}" ?`);
    if (!confirmed) return;

    setDeletingId(id);
    const previousRecords = [...records];
    // Immediate instantaneous removal
    setRecords(prev => prev.filter(r => r.id !== id && r.slug !== id));

    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Erreur lors de la suppression de la fiche.');
        setRecords(previousRecords);
      }
    } catch {
      alert('Erreur réseau lors de la suppression.');
      setRecords(previousRecords);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="linear-card" style={{
      overflow: 'hidden',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-surface)',
    }}>
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
      }}>
        <span>Répertoire actif ({records.length} fiches répertoriées)</span>
        <span>Actions directes</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ width: '120px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Domaine</th>
              <th style={{ padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Titre de la fiche</th>
              <th style={{ width: '110px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sévérité</th>
              <th style={{ width: '110px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mis à jour</th>
              <th style={{ width: '140px', textAlign: 'right', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gestion</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => {
                const catStyle = CATEGORY_STYLES[record.category] || {
                  label: record.category,
                  bg: 'var(--color-bg-subtle)',
                  text: 'var(--color-text-secondary)',
                  border: 'var(--color-border)',
                };
                const sevStyle = record.severity ? SEVERITY_STYLES[record.severity] : null;
                const formattedDate = new Date(record.updatedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric'
                });

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 100ms ease',
                    }}
                    className="admin-table-row"
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`,
                        display: 'inline-block',
                      }}>
                        {catStyle.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <Link
                        href={`/records/${record.slug}`}
                        target="_blank"
                        style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--color-text-primary)',
                          textDecoration: 'none',
                          display: 'block',
                          letterSpacing: '-0.01em',
                        }}
                        className="admin-title-link"
                      >
                        {record.title}
                      </Link>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        /{record.slug}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {sevStyle ? (
                        <span style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.text,
                          border: `1px solid ${sevStyle.border}`,
                          display: 'inline-block',
                        }}>
                          {sevStyle.label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--color-text-muted)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id, record.title)}
                          disabled={deletingId === record.id}
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#f87171',
                            backgroundColor: 'transparent',
                            border: '1px solid transparent',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            cursor: deletingId === record.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === record.id ? 0.5 : 1,
                            transition: 'all 120ms ease',
                          }}
                          className="btn-delete-action"
                        >
                          {deletingId === record.id ? '...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Aucune fiche dans le référentiel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
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
