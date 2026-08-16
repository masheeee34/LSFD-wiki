import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAll, getBySlug } from '@/lib/store';
import ContentParser from '@/components/content/ContentParser';
import MediaGallery from '@/components/content/MediaGallery';

export const revalidate = 3600; // ISR: Incremental Static Regeneration every 1 hour

export async function generateStaticParams() {
  const records = await getAll();
  return records.map((record) => ({
    slug: record.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getBySlug(slug);
  if (!record) return { title: 'Fiche Non Trouvée' };
  return {
    title: `${record.title} — LSFD Medilog`,
    description: record.summary,
  };
}

const CATEGORY_NAMES: Record<string, string> = {
  protocol: 'Protocole',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvre',
  equipment: 'Matériel',
};

const SEVERITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: {
    label: 'CRITIQUE',
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#f87171',
    border: 'rgba(239, 68, 68, 0.28)',
  },
  urgent: {
    label: 'URGENT',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  routine: {
    label: 'ROUTINE',
    bg: 'rgba(56, 189, 248, 0.08)',
    text: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.2)',
  },
};

export default async function RecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getBySlug(slug);

  if (!record) {
    notFound();
  }

  const allRecords = await getAll();
  const relatedRecords = allRecords
    .filter((r) => r.category === record.category && r.id !== record.id)
    .slice(0, 4);

  const formattedDate = new Date(record.updatedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const sevStyle = record.severity ? SEVERITY_STYLES[record.severity] : null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>
      {/* Top Breadcrumbs & Back button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="crumb-link">
            Accueil
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <Link href={`/search?category=${record.category}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="crumb-link">
            {CATEGORY_NAMES[record.category] || record.category}
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {record.slug}
          </span>
        </div>

        <Link
          href="/"
          style={{
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            fontSize: '11.5px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            transition: 'all 120ms ease',
          }}
          className="back-btn"
        >
          ← Retour
        </Link>
      </div>

      {/* Main 8 / 4 Responsive Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        alignItems: 'start',
      }} className="record-main-grid">
        
        {/* Main Column (8 cols on desktop) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }} className="record-content-col">
          {/* Header Protocol Card */}
          <div className="linear-card" style={{
            padding: '24px 28px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-subtle)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {CATEGORY_NAMES[record.category] || record.category}
              </span>

              {sevStyle && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: sevStyle.bg,
                  color: sevStyle.text,
                  border: `1px solid ${sevStyle.border}`,
                  letterSpacing: '0.04em',
                }}>
                  {sevStyle.label}
                </span>
              )}

              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-faint)',
                marginLeft: 'auto',
              }}>
                Rév. {formattedDate}
              </span>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
              margin: '0 0 10px',
            }}>
              {record.title}
            </h1>

            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}>
              {record.summary}
            </p>

            {/* Tags row */}
            {record.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {record.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      transition: 'all 120ms ease',
                    }}
                    className="tag-pill"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Clinical Markdown Execution Body */}
          <div className="linear-card" style={{
            padding: '28px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <ContentParser content={record.content} />

            {/* Embedded Media if available */}
            {record.media && record.media.length > 0 && (
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}>
                  Supports Multimédias & Vidéos Cliniques
                </div>
                <MediaGallery media={record.media} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column (4 cols on desktop) */}
        <aside style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }} className="record-sidebar-col">
          {/* Fiches associées */}
          <div className="linear-card" style={{
            padding: '16px 18px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              fontWeight: 700,
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              Fiches Associées ({CATEGORY_NAMES[record.category] || record.category})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {relatedRecords.length > 0 ? (
                relatedRecords.map(rel => (
                  <Link
                    key={rel.id}
                    href={`/records/${rel.slug}`}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'all 120ms ease',
                    }}
                    className="related-item-card"
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {rel.title}
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        marginTop: '1px',
                      }}>
                        {CATEGORY_NAMES[rel.category] || rel.category}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }} className="related-arrow">
                      →
                    </span>
                  </Link>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Aucune autre fiche dans cette catégorie</span>
              )}
            </div>
          </div>

          {/* Spécifications médicales */}
          <div className="linear-card" style={{
            padding: '16px 18px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              fontWeight: 700,
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              Spécifications Médicales
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Organisation</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>LSFD EMS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Échelon d'engagement</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>ALS / Paramedic</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Identifiant fiche</span>
                <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{record.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Statut opérationnel</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#4ade80',
                  fontWeight: 600,
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
                  }} />
                  ACTIF 2026
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .crumb-link:hover {
          color: var(--color-text-primary) !important;
        }
        .back-btn:hover {
          color: var(--color-text-primary) !important;
          background: var(--color-bg-hover) !important;
          border-color: var(--color-border-hover) !important;
        }
        .tag-pill:hover {
          color: var(--color-text-primary) !important;
          border-color: var(--color-border-hover) !important;
          background: var(--color-bg-hover) !important;
        }
        .related-item-card:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .related-item-card:hover .related-arrow {
          color: var(--color-text-primary) !important;
          transform: translateX(2px);
        }
        .related-arrow {
          transition: transform 120ms ease, color 120ms ease;
        }
        @media (max-width: 960px) {
          .record-content-col {
            grid-column: span 12 !important;
          }
          .record-sidebar-col {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}
