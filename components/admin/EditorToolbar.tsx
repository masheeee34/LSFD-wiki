'use client';

import { useState } from 'react';

type EditorToolbarProps = {
  onInsert: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export default function EditorToolbar({ onInsert, textareaRef }: EditorToolbarProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDefModal, setShowDefModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  const [linkSlug, setLinkSlug] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  
  const [defExplanation, setDefExplanation] = useState('');
  const [defWord, setDefWord] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

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

  const handleInsertLink = () => {
    if (linkSlug) {
      const text = `[[link:${linkSlug}${linkLabel ? `|${linkLabel}` : ''}]]`;
      insertText(text);
    }
    setShowLinkModal(false);
    setLinkSlug('');
    setLinkLabel('');
  };

  const handleInsertDef = () => {
    if (defExplanation && defWord) {
      const text = `[[def:${defExplanation}|${defWord}]]`;
      insertText(text);
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
      <button type="button" onClick={() => insertText('**', '**')} style={buttonStyle} title="Gras" className="tb-btn">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => insertText('*', '*')} style={buttonStyle} title="Italique" className="tb-btn">
        <em>I</em>
      </button>
      <button type="button" onClick={() => insertText('`', '`')} style={buttonStyle} title="Code" className="tb-btn">
        code
      </button>
      <button type="button" onClick={() => insertText('## ')} style={buttonStyle} title="Titre de Section" className="tb-btn">
        H2
      </button>
      <button type="button" onClick={() => insertText('### ')} style={buttonStyle} title="Sous-Titre" className="tb-btn">
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
        🖼️ Image
      </button>
      <button type="button" onClick={() => insertText('\n| Paramètre | Valeur / Recommandation |\n|---|---|\n| Dose | 1 mg IVD |\n| Répétition | Toutes les 3–5 min |\n')} style={buttonStyle} title="Insérer un Tableau" className="tb-btn">
        📊 Tableau
      </button>
      <button type="button" onClick={() => insertText('\n> [!CRITICAL] ALERTE VITALE : Détail critique obligatoire...\n')} style={buttonStyle} title="Encadré d'Urgence Critique" className="tb-btn">
        ⚠️ Alerte
      </button>
      <button type="button" onClick={() => insertText('\n> [!NOTE] Information clinique complémentaire...\n')} style={buttonStyle} title="Encadré d'Information" className="tb-btn">
        💡 Info
      </button>
      <button type="button" onClick={() => insertText('\n---\n')} style={buttonStyle} title="Ligne de séparation" className="tb-btn">
        ---
      </button>

      <div style={{ height: '14px', width: '1px', background: 'var(--color-border)', margin: '0 2px' }} />

      {/* Wiki Tags */}
      <button type="button" onClick={() => setShowLinkModal(true)} style={{ ...buttonStyle, color: showLinkModal ? 'var(--color-brand-red)' : 'var(--color-text-secondary)' }} title="Lien interne de fiche" className="tb-btn">
        [[lien]]
      </button>
      <button type="button" onClick={() => setShowDefModal(true)} style={{ ...buttonStyle, color: showDefModal ? 'var(--color-brand-red)' : 'var(--color-text-secondary)' }} title="Définition / Infobulle" className="tb-btn">
        [[définition]]
      </button>

      {/* Insert Image Mini Modal */}
      {showImageModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 20,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '10px',
          borderRadius: '6px',
          display: 'flex',
          gap: '6px',
          marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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

      {/* Insert Link Mini Modal */}
      {showLinkModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 20,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '10px',
          borderRadius: '6px',
          display: 'flex',
          gap: '6px',
          marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <input
            type="text"
            placeholder="Slug (ex: cardiac-arrest-acls)"
            value={linkSlug}
            onChange={(e) => setLinkSlug(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
          />
          <input
            type="text"
            placeholder="Texte affiché (opt)"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px' }}
          />
          <button type="button" onClick={handleInsertLink} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Insérer
          </button>
          <button type="button" onClick={() => setShowLinkModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Insert Definition Mini Modal */}
      {showDefModal && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          zIndex: 20,
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: '10px',
          borderRadius: '6px',
          display: 'flex',
          gap: '6px',
          marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <input
            type="text"
            placeholder="Terme médical (ex: GCS)"
            value={defWord}
            onChange={(e) => setDefWord(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px' }}
          />
          <input
            type="text"
            placeholder="Explication clinique..."
            value={defExplanation}
            onChange={(e) => setDefExplanation(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px' }}
          />
          <button type="button" onClick={handleInsertDef} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Insérer
          </button>
          <button type="button" onClick={() => setShowDefModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
            ✕
          </button>
        </div>
      )}
      
      <style>{`
        .tb-btn:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
