'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { WikiRecord, RecordCategory } from '@/types';

interface Props {
  records: WikiRecord[];
}

const CATEGORY_MAP: Record<string, { label: string; catKey?: RecordCategory }> = {
  all: { label: 'Tout' },
  protocol: { label: 'Protocoles', catKey: 'protocol' },
  medication: { label: 'Pharmacologie', catKey: 'medication' },
  maneuver: { label: 'Manœuvres', catKey: 'maneuver' },
  equipment: { label: 'Matériel', catKey: 'equipment' },
};

const SEVERITY_MAP: Record<string, string> = {
  critical: 'Critique',
  urgent: 'Urgent',
  routine: 'Routine',
};

export default function ClientRegistry({ records }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterText, setFilterText] = useState<string>('');

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
      if (!matchCat) return false;
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [records, selectedCategory, filterText]);

  return (
    <div className="linear-card" style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}>
      {/* Controls Bar */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY_MAP).map(([key, item]) => {
            const isActive = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--color-brand-red)' : 'var(--color-border)',
                  background: isActive ? 'var(--color-brand-red)' : 'var(--color-bg-surface)',
                  color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  transition: 'all 120ms ease',
                }}
                className="reg-filter-btn"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* In-Registry Quick Filter */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filtrer dans la liste..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: '12.5px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '10px', top: '9px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* High-Density Registry Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ width: '110px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catégorie</th>
              <th style={{ width: '270px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Titre de la fiche</th>
              <th style={{ padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Résumé clinique</th>
              <th style={{ width: '90px', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sévérité</th>
              <th style={{ width: '70px', textAlign: 'right', padding: '10px 18px', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => {
                const categoryBadge = {
                  protocol: 'Protocole',
                  medication: 'Pharma',
                  maneuver: 'Manœuvre',
                  equipment: 'Matériel',
                }[record.category] || record.category;

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 100ms ease',
                    }}
                    className="registry-row"
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <span className="badge badge-category" style={{ fontSize: '10px' }}>
                        {categoryBadge}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <Link
                        href={`/records/${record.slug}`}
                        style={{
                          color: 'var(--color-text-primary)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                          display: 'block',
                          letterSpacing: '-0.01em',
                        }}
                        className="record-link-title"
                      >
                        {record.title}
                      </Link>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        /{record.slug}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--color-text-secondary)', fontSize: '12.5px', lineHeight: 1.45 }}>
                      {record.summary}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {record.severity ? (
                        <span className={`badge badge-${record.severity}`} style={{ fontSize: '10px' }}>
                          {SEVERITY_MAP[record.severity] || record.severity}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <Link
                        href={`/records/${record.slug}`}
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--color-text-secondary)',
                          textDecoration: 'none',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          background: 'var(--color-bg-subtle)',
                          border: '1px solid var(--color-border)',
                          display: 'inline-block',
                          fontWeight: 500,
                          transition: 'all 120ms ease',
                        }}
                        className="open-btn"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Aucune fiche ne correspond à votre filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Registry Footer Status */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11.5px',
        color: 'var(--color-text-muted)',
      }}>
        <span>{filteredRecords.length} fiches répertoriées</span>
        <span>Registre officiel LSFD EMS</span>
      </div>

      <style>{`
        .reg-filter-btn:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .registry-row:hover {
          background-color: var(--color-bg-hover) !important;
        }
        .record-link-title:hover {
          color: var(--color-brand-red) !important;
        }
        .open-btn:hover {
          color: var(--color-text-primary) !important;
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
