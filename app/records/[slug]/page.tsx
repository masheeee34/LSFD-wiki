import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAll, getBySlug } from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import ContentParser from '@/components/content/ContentParser';
import MediaGallery from '@/components/content/MediaGallery';

export const dynamic = 'force-dynamic';

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

const SEVERITY_INFO: Record<string, { label: string; badgeClass: string }> = {
  critical: { label: 'CRITIQUE', badgeClass: 'badge-critical' },
  urgent: { label: 'URGENT', badgeClass: 'badge-urgent' },
  routine: { label: 'ROUTINE', badgeClass: 'badge-routine' },
};

export default async function RecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getBySlug(slug);

  if (!record) {
    notFound();
  }

  // Check Admin session for Direct Edit Button
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const isAdmin = !!(sessionToken && verifySession(sessionToken));

  const allRecords = await getAll();

  // 1. Backlinks: Other records that cite/link to this record
  const currentSlugNorm = record.slug.toLowerCase().trim();
  const citingRecords = allRecords.filter((r) => {
    if (r.id === record.id) return false;
    const content = (r.content || '').toLowerCase();
    return (
      content.includes(`[[link:${currentSlugNorm}`) ||
      content.includes(`/records/${currentSlugNorm}`) ||
      (r.summary && r.summary.toLowerCase().includes(currentSlugNorm))
    );
  });

  // 2. Outgoing References: Records that this article links to
  const linkMatches = Array.from((record.content || '').matchAll(/\[\[link:([^|\]]+)/g)).map((m) => m[1].trim().toLowerCase());
  const citedRecords = allRecords.filter((r) => {
    if (r.id === record.id) return false;
    return linkMatches.includes(r.slug.toLowerCase()) || linkMatches.includes(r.id.toLowerCase());
  });

  // 3. Category Related Records (excluding current and already cited)
  const excludeIds = new Set([record.id, ...citingRecords.map((r) => r.id), ...citedRecords.map((r) => r.id)]);
  const categoryRelated = allRecords
    .filter((r) => r.category === record.category && !excludeIds.has(r.id))
    .slice(0, 4);

  const formattedDate = new Date(record.updatedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const sevInfo = record.severity ? SEVERITY_INFO[record.severity] : null;

  // Custom Medical Specs configured by Admin
  const organization = record.specs?.organization || 'LSFD EMS';
  const echelon = record.specs?.echelon || (record.category === 'medication' ? 'ALS / Paramedic' : 'BLS & ALS');
  const operationalStatus = record.specs?.operationalStatus || 'ACTIF 2026';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>
      {/* Top Breadcrumbs & Direct Admin Edit Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        flexWrap: 'wrap',
        gap: '8px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Direct Admin Edit Mode Button */}
          {isAdmin && (
            <Link
              href={`/admin/edit/${record.id}`}
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                background: 'var(--color-brand-red)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                transition: 'all 120ms ease',
              }}
              className="admin-edit-btn"
            >
              <span>✏️</span>
              <span>Modifier cette fiche (Admin)</span>
            </Link>
          )}

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
      </div>

      {/* Main 8 / 4 Responsive Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        alignItems: 'start',
      }} className="record-main-grid">
        
        {/* Main Column (8 cols on desktop) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '16px' }} className="record-content-col">
          
          {/* Header Protocol Card */}
          <div className="linear-card" style={{
            padding: '24px 28px',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span className="badge badge-category" style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {CATEGORY_NAMES[record.category] || record.category}
              </span>

              {sevInfo && (
                <span className={`badge ${sevInfo.badgeClass}`} style={{
                  fontSize: '10.5px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}>
                  {sevInfo.label}
                </span>
              )}

              <span className="badge badge-routine" style={{ fontSize: '10px' }}>
                {echelon}
              </span>

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

            {record.summary && (
              <p style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}>
                {record.summary}
              </p>
            )}

            {/* Tags row */}
            {record.tags && record.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
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
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--color-border-subtle)' }}>
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
          
          {/* Spécifications médicales Personnalisables (100% Admin Editable) */}
          <div className="linear-card" style={{
            padding: '18px 20px',
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
              marginBottom: '14px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}>
              Spécifications Médicales
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Organisation</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{organization}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Échelon d'engagement</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{echelon}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Identifiant fiche</span>
                <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{record.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Statut opérationnel</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-cat-equip-text)',
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
                  {operationalStatus}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Backlinks: Fiches qui citent ce protocole */}
          {citingRecords.length > 0 && (
            <div className="linear-card" style={{
              padding: '16px 18px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              borderLeft: '3px solid var(--color-brand-red)',
            }}>
              <div style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-brand-red)',
                fontWeight: 700,
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>🔗 Citée dans ({citingRecords.length})</span>
                <span style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', textTransform: 'none' }}>Rétroliens</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {citingRecords.map(cite => (
                  <Link
                    key={cite.id}
                    href={`/records/${cite.slug}`}
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
                        {cite.title}
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        marginTop: '1px',
                      }}>
                        {CATEGORY_NAMES[cite.category] || cite.category}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-brand-red)', flexShrink: 0 }} className="related-arrow">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. Outgoing references: Fiches citées dans cet article */}
          {citedRecords.length > 0 && (
            <div className="linear-card" style={{
              padding: '16px 18px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              borderLeft: '3px solid var(--color-brand-blue)',
            }}>
              <div style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-brand-blue)',
                fontWeight: 700,
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>📑 Références citées ({citedRecords.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {citedRecords.map(c => (
                  <Link
                    key={c.id}
                    href={`/records/${c.slug}`}
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
                        {c.title}
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        marginTop: '1px',
                      }}>
                        {CATEGORY_NAMES[c.category] || c.category}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-brand-blue)', flexShrink: 0 }} className="related-arrow">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. Fiches de même catégorie */}
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
              borderBottom: '1px solid var(--color-border-subtle)',
            }}>
              Fiches Associées ({CATEGORY_NAMES[record.category] || record.category})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {categoryRelated.length > 0 ? (
                categoryRelated.map(rel => (
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
        .admin-edit-btn:hover {
          background-color: #b91c1c !important;
          transform: translateY(-1px);
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
          color: var(--color-brand-red) !important;
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
