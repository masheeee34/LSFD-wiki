import Link from 'next/link';
import { getPacks, getAll } from '@/lib/store';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Packs d\'Intervention Clinique — LSFD Medilog',
  description: 'Classeurs d\'intervention d\'urgence regroupant les protocoles multi-fiches avec navigation par onglets.',
};

export default async function PacksIndexPage() {
  const [packs, allRecords] = await Promise.all([getPacks(), getAll()]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '24px 20px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '18px' }}>📂</span>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Packs d'Intervention Clinique
          </h1>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Séquences cliniques multi-protocoles avec navigation par onglets fixes pour les interventions courantes et d'urgence vitale.
        </p>
      </div>

      {/* Packs Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '14px',
      }}>
        {packs.map((pack) => {
          const packRecords = pack.recordSlugs
            .map((s) => allRecords.find((r) => r.slug === s || r.id === s))
            .filter(Boolean) as typeof allRecords;

          return (
            <Link
              key={pack.id}
              href={`/packs/${pack.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 120ms ease',
                gap: '12px',
              }}
              className="pack-directory-card"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--color-brand-red)',
                    }}>
                      {pack.code || 'PACK'}
                    </span>
                    {pack.badgeLabel && (
                      <span className="badge badge-critical" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {pack.badgeLabel}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {pack.recordSlugs.length} protocoles
                  </span>
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                  {pack.title}
                </h2>

                {pack.description && (
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {pack.description}
                  </p>
                )}

                {/* Steps Breadcrumbs preview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {packRecords.map((r, i) => (
                    <span
                      key={r.id}
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {i + 1}. {r.title}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingTop: '10px',
                borderTop: '1px solid var(--color-border-subtle)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-brand-red)',
                gap: '4px',
              }}>
                <span>Ouvrir le classeur</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}

        {packs.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
            Aucun classeur d'intervention créé pour le moment.
          </div>
        )}
      </div>

      <style>{`
        .pack-directory-card:hover {
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
