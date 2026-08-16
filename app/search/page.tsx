import Link from 'next/link';
import { getAll, search } from '@/lib/store';
import type { WikiRecord, SearchResult } from '@/types';

export const metadata = { title: 'Recherche & Index — LSFD Medilog' };

const CATEGORY_LABELS: Record<string, string> = {
  protocol: 'Protocole',
  medication: 'Pharmacologie',
  maneuver: 'Manœuvre',
  equipment: 'Matériel',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Urgence vitale',
  urgent: 'Urgent',
  routine: 'Routine',
};

function buildTabHref(category: string, query: string): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (query) params.set('q', query);
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

function highlightSnippet(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(239, 68, 68, 0.25)', color: 'var(--color-text-primary)', borderRadius: '2px', padding: '0 3px', fontWeight: 600 }}>{part}</mark>
      : part
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const query = q ?? '';
  const categoryFilter = category ?? '';

  type DisplayItem = WikiRecord & { snippet?: string };
  let displayItems: DisplayItem[] = [];

  if (query) {
    const rawResults: SearchResult[] = await search(query);
    const filtered = categoryFilter
      ? rawResults.filter(r => r.record.category === categoryFilter)
      : rawResults;
    displayItems = filtered.map(r => ({ ...r.record, snippet: r.snippet }));
  } else {
    const all = await getAll();
    displayItems = (categoryFilter ? all.filter(r => r.category === categoryFilter) : all).map(r => ({ ...r }));
  }

  const tabs = [
    { label: 'Tout', category: '' },
    { label: 'Protocoles', category: 'protocol' },
    { label: 'Pharmacologie', category: 'medication' },
    { label: 'Manœuvres', category: 'maneuver' },
    { label: 'Matériel', category: 'equipment' },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', paddingBottom: '48px' }}>
      {/* Header Search & Filter Bar */}
      <div className="linear-card" style={{
        padding: '20px',
        marginBottom: '16px',
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
      }}>
        <form action="/search" method="GET" style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <input
            type="text"
            name="q"
            className="input"
            placeholder="Rechercher par mot-clé, symptôme, médicament, matériel..."
            defaultValue={query}
            style={{ fontSize: '14px', padding: '10px 14px' }}
          />
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '0 20px', fontSize: '13px', fontWeight: 600 }}>
            Rechercher
          </button>
        </form>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const isActive = tab.category === categoryFilter;
            return (
              <Link
                key={tab.category}
                href={buildTabHref(tab.category, query)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  background: isActive ? 'var(--color-brand-red)' : 'var(--color-bg-subtle)',
                  color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  border: isActive ? '1px solid var(--color-brand-red)' : '1px solid var(--color-border)',
                }}
                className="filter-tab"
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Result stats summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        fontSize: '12.5px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-muted)',
      }}>
        <span>
          {displayItems.length} résultat{displayItems.length > 1 ? 's' : ''}
          {query && <> pour <strong style={{ color: 'var(--color-text-primary)' }}>"{query}"</strong></>}
          {categoryFilter && <> dans <strong style={{ color: 'var(--color-text-primary)' }}>{CATEGORY_LABELS[categoryFilter]}</strong></>}
        </span>
        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500 }} className="return-home">
          ← Retour à l'accueil
        </Link>
      </div>

      {/* High Density Results List */}
      {displayItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayItems.map(item => (
            <div
              key={item.id}
              className="linear-card"
              style={{
                padding: '16px 20px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span className="badge badge-category" style={{ fontSize: '10.5px' }}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                {item.severity && (
                  <span className={`badge badge-${item.severity}`} style={{ fontSize: '10.5px' }}>
                    {SEVERITY_LABELS[item.severity] || item.severity}
                  </span>
                )}
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  /{item.slug}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.01em', margin: '0 0 6px' }}>
                <Link href={`/records/${item.slug}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }} className="result-title">
                  {item.title}
                </Link>
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '10px' }}>
                {item.snippet ? highlightSnippet(item.snippet, query) : item.summary}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {item.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    style={{
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                    className="tag-badge"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: 'var(--color-bg-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Aucun protocole trouvé</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {query ? `Aucun enregistrement ne correspond à "${query}". Modifiez vos termes de recherche.` : 'Sélectionnez un filtre ou entrez une recherche.'}
          </p>
        </div>
      )}

      <style>{`
        .return-home:hover {
          color: var(--color-brand-red) !important;
        }
        .result-title:hover {
          color: var(--color-brand-red) !important;
        }
        .tag-badge:hover {
          color: var(--color-text-primary) !important;
          border-color: var(--color-border-hover) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .filter-tab:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
