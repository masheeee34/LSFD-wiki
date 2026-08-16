import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';
import { fontSans, fontMono } from '@/app/fonts';
import ThemeToggle from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: {
    template: '%s | LSFD Medilog',
    default: 'LSFD Medilog — Emergency Medical Services',
  },
  description: 'Portail médical d\'intervention d\'urgence du Los Santos Fire Department. Directives cliniques, protocoles ACLS/ATLS et pharmacopée.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('lsfd-theme');
                  var theme = saved || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-base)' }}>
          {/* Top Navigation Bar */}
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'var(--color-bg-surface)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--color-border)',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
          }}>
            <div style={{
              maxWidth: '1440px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              {/* Logo / Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}>
                  {/* Clean LSFD EMS Hexagon Logo */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Image
                      src="/lsfd-logo.png"
                      alt="LSFD EMS Logo"
                      width={38}
                      height={38}
                      style={{ objectFit: 'contain' }}
                      priority
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 800,
                      fontSize: '16px',
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                    }}>
                      LSFD
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      color: 'var(--color-brand-red)',
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                    }}>
                      Medilog
                    </span>
                  </div>
                </Link>

                <div style={{ height: '16px', width: '1px', background: 'var(--color-border)' }} />

                {/* Quick Domain Links */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="nav-desktop">
                  <NavLink href="/search?category=protocol">Protocoles</NavLink>
                  <NavLink href="/search?category=medication">Pharmacologie</NavLink>
                  <NavLink href="/search?category=maneuver">Manœuvres</NavLink>
                  <NavLink href="/search?category=equipment">Matériel</NavLink>
                </nav>
              </div>



              {/* Right Side: Status + Theme Toggle + Admin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Light / Night Mode Responsive Toggle */}
                <ThemeToggle />

                <Link
                  href="/admin"
                  style={{
                    fontSize: '12.5px',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-surface)',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="admin-link"
                >
                  Admin
                </Link>
              </div>
            </div>
          </header>

          {/* Main Content (Centered Flex Container) */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
              {children}
            </div>
          </main>

          {/* Minimal Bottom Bar */}
          <footer style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            padding: '14px 20px',
            fontSize: '11.5px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Los Santos Fire Department — Emergency Medical Services Agency</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Édition 2026</span>
            </div>
          </footer>
        </div>

        <style>{`
          .nav-desktop {
            display: flex;
          }
          .top-nav-item {
            padding: 5px 10px;
            font-size: 12.5px;
            color: var(--color-text-secondary);
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            font-family: var(--font-sans);
            transition: all 120ms ease;
          }
          .top-nav-item:hover {
            color: var(--color-brand-blue);
            background: var(--color-bg-hover);
          }
          .admin-link:hover {
            color: var(--color-brand-blue) !important;
            border-color: var(--color-brand-blue-border) !important;
            background: var(--color-bg-hover) !important;
          }
          @media (max-width: 860px) {
            .nav-desktop {
              display: none;
            }
          }
        `}</style>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="top-nav-item">
      {children}
    </Link>
  );
}
