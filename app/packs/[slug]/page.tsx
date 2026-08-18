import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPacks, getPackBySlug, getAll, getGlobalDictionary } from '@/lib/store';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import PackViewer from '@/components/packs/PackViewer';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const packs = await getPacks();
  return packs.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getPackBySlug(slug);
  if (!pack) return { title: 'Pack Non Trouvé' };
  return {
    title: `${pack.title} — Pack d'Intervention LSFD`,
    description: pack.description,
  };
}

export default async function PackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getPackBySlug(slug);

  if (!pack) {
    notFound();
  }

  // Check Admin session for Direct Edit Button
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const isAdmin = !!(sessionToken && verifySession(sessionToken));

  const [allRecords, dictionary] = await Promise.all([getAll(), getGlobalDictionary()]);

  // Resolve all wiki records in order
  const packRecords = pack.recordSlugs
    .map((s) => allRecords.find((r) => r.slug === s || r.id === s))
    .filter(Boolean) as typeof allRecords;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>
      {/* Top Breadcrumbs & Back */}
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
          <span style={{ color: 'var(--color-brand-red)', fontWeight: 600 }}>
            Packs d'Intervention
          </span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {pack.slug}
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
          ← Retour à l'accueil
        </Link>
      </div>

      {/* Main Pack Viewer */}
      <PackViewer pack={pack} records={packRecords} isAdmin={isAdmin} dictionary={dictionary} />

      <style>{`
        .crumb-link:hover {
          color: var(--color-text-primary) !important;
        }
        .back-btn:hover {
          color: var(--color-text-primary) !important;
          background: var(--color-bg-hover) !important;
          border-color: var(--color-border-hover) !important;
        }
      `}</style>
    </div>
  );
}
