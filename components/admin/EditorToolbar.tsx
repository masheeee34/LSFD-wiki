'use client';

import { useState, useEffect } from 'react';
import type { WikiRecord } from '@/types';

type EditorToolbarProps = {
  onInsert: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const COLOR_OPTIONS = [
  { name: 'Rouge', key: 'red', hex: '#ef4444', isBold: false },
  { name: 'Rouge Gras', key: 'red,bold', hex: '#ef4444', isBold: true },
  { name: 'Bleu', key: 'blue', hex: '#3b82f6', isBold: false },
  { name: 'Bleu Gras', key: 'blue,bold', hex: '#3b82f6', isBold: true },
  { name: 'Vert', key: 'green', hex: '#10b981', isBold: false },
  { name: 'Vert Gras', key: 'green,bold', hex: '#10b981', isBold: true },
  { name: 'Or / Jaune', key: 'gold', hex: '#f59e0b', isBold: false },
  { name: 'Or Gras', key: 'gold,bold', hex: '#f59e0b', isBold: true },
  { name: 'Violet', key: 'purple', hex: '#a855f7', isBold: false },
  { name: 'Violet Gras', key: 'purple,bold', hex: '#a855f7', isBold: true },
  { name: 'Cyan', key: 'cyan', hex: '#06b6d4', isBold: false },
  { name: 'Cyan Gras', key: 'cyan,bold', hex: '#06b6d4', isBold: true },
];

export default function EditorToolbar({ onInsert, textareaRef }: EditorToolbarProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDefModal, setShowDefModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [allRecords, setAllRecords] = useState<Array<{ slug: string; title: string }>>([]);
  const [linkSlug, setLinkSlug] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  
  const [defExplanation, setDefExplanation] = useState('');
  const [defWord, setDefWord] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  useEffect(() => {
    fetch('/api/records', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllRecords(data.map((r: WikiRecord) => ({ slug: r.slug, title: r.title })));
        }
      })
      .catch(() => {});
  }, []);

  const getSelectedTextInfo = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { start: 0, end: 0, text: '', selected: '' };
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    return { start, end, text, selected };
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    onInsert(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleOpenLinkModal = () => {
    const { selected } = getSelectedTextInfo();
    if (selected.trim()) {
      setLinkLabel(selected.trim());
      const found = allRecords.find(r => 
        r.title.toLowerCase().includes(selected.toLowerCase()) || 
        r.slug.toLowerCase().includes(selected.toLowerCase())
      );
      if (found) {
        setLinkSlug(found.slug);
      } else {
        setLinkSlug('');
      }
    } else {
      setLinkLabel('');
      setLinkSlug('');
    }
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (linkSlug) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const fullText = textarea.value;
        const tag = `[[link:${linkSlug}${linkLabel ? `|${linkLabel}` : ''}]]`;
        const newText = fullText.substring(0, start) + tag + fullText.substring(end);
        onInsert(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      }
    }
    setShowLinkModal(false);
    setLinkSlug('');
    setLinkLabel('');
  };

  const handleApplyColor = (colorKey: string) => {
    const { selected } = getSelectedTextInfo();
    if (selected) {
      insertText(`[[color:${colorKey}|`, ']]');
    } else {
      insertText(`[[color:${colorKey}|Texte en couleur]]`);
    }
    setShowColorPicker(false);
  };

  const handleOpenDefModal = () => {
    const { selected } = getSelectedTextInfo();
    if (selected.trim()) {
      setDefWord(selected.trim());
    } else {
      setDefWord('');
    }
    setDefExplanation('');
    setShowDefModal(true);
  };

  const handleInsertDef = () => {
    if (defExplanation && defWord) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const fullText = textarea.value;
        const tag = `[[def:${defExplanation}|${defWord}]]`;
        const newText = fullText.substring(0, start) + tag + fullText.substring(end);
        onInsert(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      }
    }
    setShowDefModal(false);
    setDefExplanation('');
    setDefWord('');
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      const text = `\n![${imageAlt || 'Illustration'}](${imageUrl})\n`;
      insertText(text);
    }
    setShowImageModal(false);
    setImageUrl('');
    setImageAlt('');
  };

  const buttonStyle: React.CSSProperties = {
    height: '26px',
    padding: '0 8px',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-text-secondary)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    transition: 'all 120ms ease',
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      gap: '3px',
      padding: '6px 8px',
      backgroundColor: 'var(--color-bg-subtle)',
      borderBottom: '1px solid var(--color-border)',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <button type="button" onClick={() => insertText('**', '**')} style={buttonStyle} title="Gras (**texte**)" className="tb-btn">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => insertText('*', '*')} style={buttonStyle} title="Italique (*texte*)" className="tb-btn">
        <em>I</em>
      </button>
      <button type="button" onClick={() => insertText('`', '`')} style={buttonStyle} title="Code (`code`)" className="tb-btn">
        code
      </button>

      {/* Text Colors Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{ ...buttonStyle, color: showColorPicker ? '#ef4444' : 'var(--color-text-secondary)' }}
          title="Couleur du texte"
          className="tb-btn"
        >
          Couleur ▾
        </button>

        {showColorPicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 30,
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '4px',
            minWidth: '240px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            marginTop: '4px',
          }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => handleApplyColor(c.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  fontWeight: c.isBold ? 700 : 400,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textAlign: 'left',
                }}
                className="color-option-btn"
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: c.hex, flexShrink: 0 }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={() => insertText('## ')} style={buttonStyle} title="Titre H2" className="tb-btn">
        H2
      </button>
      <button type="button" onClick={() => insertText('### ')} style={buttonStyle} title="Sous-Titre H3" className="tb-btn">
        H3
      </button>

      <div style={{ height: '14px', width: '1px', background: 'var(--color-border)', margin: '0 2px' }} />

      {/* Lists */}
      <button type="button" onClick={() => insertText('\n1. Première étape\n2. Deuxième étape\n3. Troisième étape\n')} style={buttonStyle} title="Liste Numérotée (Étapes)" className="tb-btn">
        1. 2. 3.
      </button>
      <button type="button" onClick={() => insertText('\n- Point 1\n- Point 2\n- Point 3\n')} style={buttonStyle} title="Liste à Puces" className="tb-btn">
        • Liste
      </button>

      <div style={{ height: '14px', width: '1px', background: 'var(--color-border)', margin: '0 2px' }} />

      {/* Image & Table & Callouts */}
      <button type="button" onClick={() => setShowImageModal(true)} style={{ ...buttonStyle, color: showImageModal ? 'var(--color-brand-red)' : 'var(--color-text-secondary)' }} title="Insérer une Image" className="tb-btn">
        Image
      </button>
      <button type="button" onClick={() => insertText('\n| Paramètre | Valeur / Recommandation |\n|---|---|\n| Dose | 1 mg IVD |\n| Répétition | Toutes les 3–5 min |\n')} style={buttonStyle} title="Insérer un Tableau" className="tb-btn">
        Tableau
      </button>
      <button type="button" onClick={() => insertText('\n> [!CRITICAL] ALERTE VITALE : Détail critique obligatoire...\n')} style={buttonStyle} title="Encadré d'Urgence Critique" className="tb-btn">
        Alerte
      </button>
      <button type="button" onClick={() => insertText('\n> [!NOTE] Information clinique complémentaire...\n')} style={buttonStyle} title="Encadré d'Information" className="tb-btn">
        Info
      </button>
      <button type="button" onClick={() => insertText('\n---\n')} style={buttonStyle} title="Ligne de séparation" className="tb-btn">
        ---
      </button>

      <div style={{ height: '14px', width: '1px', background: 'var(--color-border)', margin: '0 2px' }} />

      {/* Smart Wiki Tags */}
      <button type="button" onClick={handleOpenLinkModal} style={{ ...buttonStyle, color: showLinkModal ? 'var(--color-brand-red)' : 'var(--color-text-secondary)' }} title="Lien intelligent vers une autre fiche" className="tb-btn">
        [[lien]]
      </button>
      <button type="button" onClick={handleOpenDefModal} style={{ ...buttonStyle, color: showDefModal ? 'var(--color-brand-red)' : 'var(--color-text-secondary)' }} title="Définition / Infobulle" className="tb-btn">
        [[définition]]
      </button>

      {/* Insert Image Mini Modal */}
      {showImageModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 30,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '10px',
          borderRadius: '6px',
          display: 'flex',
          gap: '6px',
          marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <input
            type="text"
            placeholder="URL de l'image (https://...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', width: '220px' }}
          />
          <input
            type="text"
            placeholder="Légende / Titre"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', width: '150px' }}
          />
          <button type="button" onClick={handleInsertImage} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Insérer
          </button>
          <button type="button" onClick={() => setShowImageModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Smart Insert Link Modal */}
      {showLinkModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 30,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '12px',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '4px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          minWidth: '320px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            CRÉER UN LIEN VERS UNE FICHE
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
              Choisir une fiche existante :
            </label>
            <select
              value={linkSlug}
              onChange={(e) => {
                const s = e.target.value;
                setLinkSlug(s);
                if (!linkLabel) {
                  const rec = allRecords.find(r => r.slug === s);
                  if (rec) setLinkLabel(rec.title);
                }
              }}
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', width: '100%' }}
            >
              <option value="">-- Sélectionner dans la liste --</option>
              {allRecords.map(r => (
                <option key={r.slug} value={r.slug}>
                  {r.title} ({r.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
              Ou saisir manuellement le slug :
            </label>
            <input
              type="text"
              placeholder="ex: echelle-avpu ou evaluation-initiale"
              value={linkSlug}
              onChange={(e) => setLinkSlug(e.target.value)}
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
              Texte du lien affiché (remplace la sélection) :
            </label>
            <input
              type="text"
              placeholder="ex: AVPU ou voir protocole"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
            <button type="button" onClick={() => setShowLinkModal(false)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
              Annuler
            </button>
            <button type="button" onClick={handleInsertLink} disabled={!linkSlug} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '11px' }}>
              Insérer Lien
            </button>
          </div>
        </div>
      )}

      {/* Insert Definition Mini Modal */}
      {showDefModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 30,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '12px',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '4px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          minWidth: '300px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            DÉFINITION / INFOBULLE CLINIQUE
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
              Mot ou terme médical :
            </label>
            <input
              type="text"
              placeholder="ex: GCS ou RSI ou AVC"
              value={defWord}
              onChange={(e) => setDefWord(e.target.value)}
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
              Explication de l'infobulle :
            </label>
            <input
              type="text"
              placeholder="ex: Glasgow Coma Scale, score neurologique..."
              value={defExplanation}
              onChange={(e) => setDefExplanation(e.target.value)}
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
            <button type="button" onClick={() => setShowDefModal(false)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
              Annuler
            </button>
            <button type="button" onClick={handleInsertDef} disabled={!defWord || !defExplanation} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '11px' }}>
              Insérer Définition
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        .tb-btn:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .color-option-btn:hover {
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
