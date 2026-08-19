'use client';

import { useState, useRef } from 'react';
import type { WikiRecord, RecordCategory, SeverityLevel, MediaItem, MedicalSpecs } from '@/types';
import ContentParser from '@/components/content/ContentParser';
import EditorToolbar from './EditorToolbar';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type RecordFormProps = {
  initialData?: Partial<WikiRecord>;
  onSubmit: (data: Omit<WikiRecord, 'id' | 'updatedAt'>) => Promise<void>;
  isLoading?: boolean;
};

export default function RecordForm({ initialData, onSubmit, isLoading = false }: RecordFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [isSlugManual, setIsSlugManual] = useState(!!initialData?.slug);
  const [category, setCategory] = useState<RecordCategory>(initialData?.category || 'protocol');
  const [severity, setSeverity] = useState<SeverityLevel | ''>(initialData?.severity || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media || []);
  
  // Custom Medical Specs (3 clear non-redundant fields)
  const [organization, setOrganization] = useState(initialData?.specs?.organization || 'LSFD EMS');
  const [echelon, setEchelon] = useState(initialData?.specs?.echelon || (initialData?.category === 'medication' ? 'ALS' : 'BLS'));
  const [operationalStatus, setOperationalStatus] = useState(initialData?.specs?.operationalStatus || 'ACTIF 2026');

  const [showSpecsSection, setShowSpecsSection] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
  };

  const handleEditorInsert = (newContent: string) => {
    setContent(newContent);
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const addMedia = () => {
    setMedia([
      ...media,
      { id: Date.now().toString(), type: 'image', url: '', caption: '' }
    ]);
  };

  const updateMedia = (index: number, field: keyof MediaItem, val: string) => {
    const updated = [...media];
    updated[index] = { ...updated[index], [field]: val };
    setMedia(updated);
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !content) return;
    
    const specs: MedicalSpecs = {
      organization: organization.trim() || 'LSFD EMS',
      echelon: echelon.trim() || 'ALS',
      operationalStatus: operationalStatus.trim() || 'ACTIF 2026',
    };

    await onSubmit({
      title,
      slug,
      category,
      severity: severity || undefined,
      summary,
      content,
      tags,
      media,
      specs,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }} className="form-grid">
      {/* Left Column: Editor Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Titre de la fiche
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={handleTitleChange} 
              placeholder="ex: Arrêt Cardiaque ACLS"
              required
              className="input form-input-control"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Slug URL
            </label>
            <input 
              type="text" 
              value={slug} 
              onChange={e => { setSlug(e.target.value); setIsSlugManual(true); }} 
              placeholder="cardiac-arrest-acls"
              required
              className="input form-input-control"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Domaine / Catégorie
            </label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as RecordCategory)}
              className="select form-input-control"
            >
              <option value="protocol">Protocole</option>
              <option value="medication">Pharmacologie</option>
              <option value="maneuver">Manœuvre</option>
              <option value="equipment">Matériel</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Niveau de sévérité
            </label>
            <select 
              value={severity} 
              onChange={e => setSeverity(e.target.value as SeverityLevel | '')}
              className="select form-input-control"
            >
              <option value="">Non renseigné</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critique / Urgence vitale</option>
            </select>
          </div>
        </div>

        {/* Custom Medical Specs (No duplicates) */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div 
            onClick={() => setShowSpecsSection(!showSpecsSection)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                SPÉCIFICATIONS MÉDICALES
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {showSpecsSection ? '▼ Masquer' : '▲ Afficher'}
            </span>
          </div>

          {showSpecsSection && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Organisation
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  placeholder="LSFD EMS"
                  className="input form-input-control"
                  style={{ fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Habilitation / Échelon Requis
                </label>
                <select
                  value={echelon}
                  onChange={e => setEchelon(e.target.value)}
                  className="select form-input-control"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                >
                  <option value="Tous">Tous</option>
                  <option value="BLS">BLS</option>
                  <option value="ALS">ALS</option>
                  <option value="OLMC">OLMC</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Statut opérationnel
                </label>
                <input
                  type="text"
                  value={operationalStatus}
                  onChange={e => setOperationalStatus(e.target.value)}
                  placeholder="ACTIF 2026"
                  className="input form-input-control"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            Résumé d'intervention
          </label>
          <textarea 
            rows={2} 
            value={summary} 
            onChange={e => setSummary(e.target.value)}
            placeholder="Résumé clinique succinct et critères d'engagement..."
            className="textarea form-input-control"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            Tags & Mots-clés
          </label>
          <div className="tag-container-box" style={{
            padding: '8px 10px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
          }}>
            {tags.map(tag => (
              <span key={tag} style={{
                backgroundColor: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, fontWeight: 700 }}>&times;</button>
              </span>
            ))}
            <input 
              type="text" 
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Ajouter tag + Entrée..."
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', flex: 1, minWidth: '130px', outline: 'none', fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>

        {/* Media attachments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Supports multimédias
            </label>
            <button type="button" onClick={addMedia} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11.5px' }}>
              + Ajouter URL
            </button>
          </div>
          {media.map((item, index) => (
            <div key={item.id || index} style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', padding: '10px', borderRadius: '6px', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select value={item.type} onChange={e => updateMedia(index, 'type', e.target.value)} className="select form-input-control" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}>
                  <option value="image">Image</option>
                  <option value="video">Vidéo (YouTube/Vimeo)</option>
                </select>
                <input type="text" placeholder="https://..." value={item.url} onChange={e => updateMedia(index, 'url', e.target.value)} className="input form-input-control" style={{ flex: 1, padding: '4px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                <button type="button" onClick={() => removeMedia(index)} className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '11px' }}>&times;</button>
              </div>
              <input type="text" placeholder="Légende médicale (optionnelle)" value={item.caption || ''} onChange={e => updateMedia(index, 'caption', e.target.value)} className="input form-input-control" style={{ width: '100%', padding: '4px 8px', fontSize: '12px' }} />
            </div>
          ))}
        </div>

        {/* Markdown Content Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            Contenu clinique & étapes du protocole (Markdown)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <EditorToolbar onInsert={handleEditorInsert} textareaRef={textareaRef} />
            <textarea 
              ref={textareaRef}
              rows={18} 
              value={content} 
              onChange={e => setContent(e.target.value)}
              placeholder="Rédigez ici le protocole (utilisez ## Titre, [[link:slug|label]], [[def:explication|mot]], tableaux, etc.)..."
              className="form-markdown-textarea"
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-surface)',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                lineHeight: 1.55,
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}
        >
          {isLoading ? 'Enregistrement en cours...' : 'Enregistrer la fiche'}
        </button>
      </div>

      {/* Right Column: Live Clinical Preview */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="linear-card" style={{
          position: 'sticky',
          top: '70px',
          padding: '20px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
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
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Prévisualisation temps réel
            </span>
            <span className="badge badge-routine" style={{ fontSize: '10.5px' }}>Aperçu</span>
          </div>

          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-category">{category}</span>
              {severity && <span className={`badge badge-${severity}`}>{severity}</span>}
              <span className="badge badge-routine" style={{ fontSize: '10px' }}>{echelon}</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              {title || 'Titre du protocole'}
            </h2>
            {summary && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>{summary}</p>}
            
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px' }}>
              {content ? (
                <ContentParser content={content} />
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                  Le contenu formaté s'affichera ici au fur et à mesure de votre saisie.
                </p>
              )}
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
        .tag-container-box {
          background-color: var(--color-bg-surface) !important;
          border-color: var(--color-border) !important;
        }
        .form-markdown-textarea {
          background-color: var(--color-bg-surface) !important;
          color: var(--color-text-primary) !important;
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
