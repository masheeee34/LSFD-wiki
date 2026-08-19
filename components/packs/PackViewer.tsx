'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { InterventionPack, WikiRecord } from '@/types';
import ContentParser from '@/components/content/ContentParser';

interface PackViewerProps {
  pack: InterventionPack;
  records: WikiRecord[];
  isAdmin?: boolean;
  dictionary?: Record<string, string>;
}

const CATEGORY_NAMES: Record<string, string> = {
  protocol: 'Protocole',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvre',
  equipment: 'Matériel',
};

export default function PackViewer({ pack, records, isAdmin = false, dictionary }: PackViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'tabs' | 'continuous'>('tabs');

  // Keyboard shortcut to flip through tabs (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'tabs') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowRight' && activeTab < records.length - 1) {
        setActiveTab(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && activeTab > 0) {
        setActiveTab(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, records.length, viewMode]);

  const currentRecord = records[activeTab];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Pack Header Card */}
      <div className="linear-card" style={{
        padding: '22px 26px',
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--color-brand-red)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              letterSpacing: '0.04em',
            }}>
              {pack.code || 'PACK-INTERVENTION'}
            </span>
            {pack.badgeLabel && (
              <span className="badge badge-critical" style={{ fontSize: '10.5px' }}>
                {pack.badgeLabel}
              </span>
            )}
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              {records.length} fiches cliniques
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdmin && (
              <Link
                href={`/admin/packs/edit/${pack.id}`}
                style={{
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'var(--color-brand-red)',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>✏️</span>
                <span>Modifier Pack (Admin)</span>
              </Link>
            )}

            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '2px',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('tabs')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'tabs' ? 'var(--color-bg-surface)' : 'transparent',
                  color: viewMode === 'tabs' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontSize: '11.5px',
                  fontWeight: viewMode === 'tabs' ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: viewMode === 'tabs' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 120ms ease',
                }}
              >
                📑 Mode Onglets
              </button>
              <button
                type="button"
                onClick={() => setViewMode('continuous')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'continuous' ? 'var(--color-bg-surface)' : 'transparent',
                  color: viewMode === 'continuous' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontSize: '11.5px',
                  fontWeight: viewMode === 'continuous' ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: viewMode === 'continuous' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 120ms ease',
                }}
              >
                📜 Vue Continue
              </button>
            </div>
          </div>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.025em',
          margin: '0 0 8px',
        }}>
          {pack.title}
        </h1>

        {pack.description && (
          <p style={{
            fontSize: '13.5px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.55,
            margin: 0,
          }}>
            {pack.description}
          </p>
        )}
      </div>

      {/* 24/7 STICKY INTERACTIVE TOP TABS BAR */}
      <div style={{
        position: 'sticky',
        top: '56px',
        zIndex: 40,
        backgroundColor: 'var(--color-bg-base)',
        borderBottom: '1px solid var(--color-border)',
        padding: '10px 0',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          alignItems: 'center',
        }}>
          {records.map((rec, idx) => {
            const isActive = viewMode === 'tabs' ? activeTab === idx : false;
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => {
                  if (viewMode === 'tabs') {
                    setActiveTab(idx);
                  } else {
                    const el = document.getElementById(`record-section-${rec.slug}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-bg-surface)' : 'var(--color-bg-subtle)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 120ms ease',
                }}
                className="pack-tab-btn"
              >
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--color-brand-red)' : 'var(--color-text-muted)',
                  fontWeight: 700,
                }}>
                  {idx + 1}.
                </span>
                <span>{rec.title}</span>
                <span className="badge badge-category" style={{ fontSize: '9px', padding: '1px 5px' }}>
                  {CATEGORY_NAMES[rec.category] || rec.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1: TABS (Onglets individuels rapides) */}
      {viewMode === 'tabs' && currentRecord && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Record Card */}
          <div className="linear-card" style={{
            padding: '28px 32px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-category" style={{ fontSize: '10px' }}>
                  {CATEGORY_NAMES[currentRecord.category] || currentRecord.category}
                </span>
                {currentRecord.severity && (
                  <span className={`badge badge-${currentRecord.severity}`} style={{ fontSize: '10px' }}>
                    {currentRecord.severity.toUpperCase()}
                  </span>
                )}
                <span className="badge badge-routine" style={{ fontSize: '10px' }}>
                  {currentRecord.specs?.echelon || 'ALS / BLS'}
                </span>
              </div>

              <Link
                href={`/records/${currentRecord.slug}`}
                target="_blank"
                style={{
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                className="direct-record-link"
              >
                <span>Ouvrir fiche seule</span>
                <span>↗</span>
              </Link>
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
            }}>
              {currentRecord.title}
            </h2>

            {currentRecord.summary && (
              <p style={{
                fontSize: '13.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.55,
                margin: '0 0 20px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}>
                {currentRecord.summary}
              </p>
            )}

            {/* Markdown Content */}
            <ContentParser content={currentRecord.content} dictionary={dictionary} />
          </div>

          {/* Stepper Navigation Buttons (Précédent / Suivant) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
          }}>
            <button
              type="button"
              disabled={activeTab === 0}
              onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-subtle)',
                color: activeTab === 0 ? 'var(--color-text-faint)' : 'var(--color-text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: activeTab === 0 ? 'not-allowed' : 'pointer',
                opacity: activeTab === 0 ? 0.5 : 1,
                transition: 'all 120ms ease',
              }}
            >
              <span>← Étape précédente</span>
            </button>

            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              Étape {activeTab + 1} sur {records.length}
            </span>

            <button
              type="button"
              disabled={activeTab === records.length - 1}
              onClick={() => setActiveTab(prev => Math.min(records.length - 1, prev + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: activeTab === records.length - 1 ? 'var(--color-bg-subtle)' : 'var(--color-brand-red)',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: activeTab === records.length - 1 ? 'not-allowed' : 'pointer',
                opacity: activeTab === records.length - 1 ? 0.5 : 1,
                transition: 'all 120ms ease',
              }}
            >
              <span>Étape suivante →</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: CONTINUOUS VIEW (Tous les protocoles à la suite) */}
      {viewMode === 'continuous' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {records.map((rec, idx) => (
            <div
              key={rec.id}
              id={`record-section-${rec.slug}`}
              className="linear-card"
              style={{
                padding: '28px 32px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-brand-red)',
                  }}>
                    #{idx + 1}
                  </span>
                  <span className="badge badge-category" style={{ fontSize: '10px' }}>
                    {CATEGORY_NAMES[rec.category] || rec.category}
                  </span>
                  {rec.severity && (
                    <span className={`badge badge-${rec.severity}`} style={{ fontSize: '10px' }}>
                      {rec.severity.toUpperCase()}
                    </span>
                  )}
                </div>

                <Link
                  href={`/records/${rec.slug}`}
                  target="_blank"
                  style={{
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                  }}
                  className="direct-record-link"
                >
                  Fiche dédiée ↗
                </Link>
              </div>

              <h2 style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 10px',
              }}>
                {rec.title}
              </h2>

              {rec.summary && (
                <p style={{
                  fontSize: '13.5px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.55,
                  margin: '0 0 20px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}>
                  {rec.summary}
                </p>
              )}

              <ContentParser content={rec.content} dictionary={dictionary} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        .pack-tab-btn:hover {
          border-color: var(--color-border-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .direct-record-link:hover {
          color: var(--color-brand-red) !important;
        }
      `}</style>
    </div>
  );
}
