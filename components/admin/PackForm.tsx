'use client';

import { useState } from 'react';
import type { InterventionPack, WikiRecord } from '@/types';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface PackFormProps {
  initialData?: Partial<InterventionPack>;
  allRecords: WikiRecord[];
  onSubmit: (data: Omit<InterventionPack, 'id' | 'updatedAt'>) => Promise<void>;
  isLoading?: boolean;
}

export default function PackForm({ initialData, allRecords, onSubmit, isLoading = false }: PackFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [isSlugManual, setIsSlugManual] = useState(!!initialData?.slug);
  const [code, setCode] = useState(initialData?.code || 'PACK-01');
  const [badgeLabel, setBadgeLabel] = useState(initialData?.badgeLabel || 'URGENCE VITALE');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialData?.recordSlugs || []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
  };

  const toggleSlug = (recordSlug: string) => {
    if (selectedSlugs.includes(recordSlug)) {
      setSelectedSlugs(selectedSlugs.filter(s => s !== recordSlug));
    } else {
      setSelectedSlugs([...selectedSlugs, recordSlug]);
    }
  };

  const moveSlug = (index: number, direction: 'up' | 'down') => {
    const updated = [...selectedSlugs];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSelectedSlugs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || selectedSlugs.length === 0) {
      alert('Veuillez renseigner le titre et sélectionner au moins une fiche.');
      return;
    }

    await onSubmit({
      title,
      slug,
      code,
      badgeLabel: badgeLabel || undefined,
      description,
      recordSlugs: selectedSlugs,
    });
  };

  // Resolve selected records for preview
  const resolvedRecords = selectedSlugs
    .map(s => allRecords.find(r => r.slug === s || r.id === s))
    .filter(Boolean) as WikiRecord[];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }} className="form-grid">
      {/* Left Column: Form Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Title & Slug */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
              Titre du Pack / Classeur
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="ex: Prise en Charge du Polytraumatisé Grave"
              required
              className="input form-input-control"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
              Slug URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setIsSlugManual(true); }}
              placeholder="polytraumatisme-grave"
              required
              className="input form-input-control"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Code & Badge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
              Code Pack (ex: PACK-01)
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="PACK-01"
              required
              className="input form-input-control"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
              Badge d'Alerte (ex: URGENCE VITALE, ALS)
            </label>
            <input
              type="text"
              value={badgeLabel}
              onChange={e => setBadgeLabel(e.target.value)}
              placeholder="URGENCE VITALE"
              className="input form-input-control"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
            Description succincte de la séquence
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez l'objectif de ce pack d'intervention..."
            className="textarea form-input-control"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Multi-Record Selector & Reordering */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              COMPOSITION DU PACK ({selectedSlugs.length} sélectionné{selectedSlugs.length > 1 ? 's' : ''})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Cochez les fiches à inclure et réordonnez la séquence
            </span>
          </div>

          {/* List of currently ordered records */}
          {selectedSlugs.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '8px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                Ordre de lecture dans le pack (de gauche à droite) :
              </div>
              {selectedSlugs.map((s, idx) => {
                const rec = allRecords.find(r => r.slug === s || r.id === s);
                return (
                  <div
                    key={s}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-red)' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec?.title || s}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSlug(idx, 'up')}
                        style={{
                          background: 'var(--color-bg-subtle)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          borderRadius: '3px',
                          padding: '1px 6px',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.4 : 1,
                        }}
                        title="Monter"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedSlugs.length - 1}
                        onClick={() => moveSlug(idx, 'down')}
                        style={{
                          background: 'var(--color-bg-subtle)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          borderRadius: '3px',
                          padding: '1px 6px',
                          cursor: idx === selectedSlugs.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === selectedSlugs.length - 1 ? 0.4 : 1,
                        }}
                        title="Descendre"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSlug(s)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          borderRadius: '3px',
                          padding: '1px 6px',
                          cursor: 'pointer',
                          marginLeft: '4px',
                        }}
                        title="Retirer du pack"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Record Selection Pool */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Sélectionner parmi toutes les fiches disponibles :
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '6px',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-subtle)',
            }}>
              {allRecords.map(r => {
                const isSelected = selectedSlugs.includes(r.slug) || selectedSlugs.includes(r.id);
                return (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-surface)',
                      border: isSelected ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSlug(r.slug)}
                    />
                    <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-brand-red)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
        >
          {isLoading ? 'Enregistrement en cours...' : 'Enregistrer le Pack d\'Intervention'}
        </button>
      </div>

      {/* Right Column: Live Pack Preview */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="linear-card" style={{
          position: 'sticky',
          top: '70px',
          padding: '20px',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border-subtle)',
            paddingBottom: '8px',
            marginBottom: '14px',
          }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              APERÇU DU CLASSEUR
            </span>
            <span className="badge badge-critical" style={{ fontSize: '9px' }}>
              {badgeLabel || 'PACK'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: 'var(--color-brand-red)' }}>
              {code || 'PACK-01'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              · {selectedSlugs.length} protocoles
            </span>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
            {title || 'Titre du Pack d\'intervention'}
          </h3>

          {description && (
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: '0 0 14px' }}>
              {description}
            </p>
          )}

          {/* Tabs Preview */}
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Onglets en haut de page :
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {resolvedRecords.map((r, i) => (
                <span
                  key={r.id}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: i === 0 ? 'var(--color-brand-red)' : 'var(--color-bg-subtle)',
                    color: i === 0 ? '#ffffff' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 600,
                  }}
                >
                  {i + 1}. {r.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .form-input-control {
          background-color: var(--color-bg-surface) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }
        @media (max-width: 860px) {
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </form>
  );
}
