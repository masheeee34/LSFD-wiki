import type { Metadata } from 'next';
import './globals.css';
import { fontSans, fontMono } from '@/app/fonts';
import GlobalHeader from '@/components/navigation/GlobalHeader';

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
          {/* Universal Global Header with Navigation, Theme Toggle, and Search */}
          <GlobalHeader />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            {children}
          </main>
          
          <footer style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            padding: '12px 20px',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}>
            <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Los Santos Fire Department — Emergency Medical Services Agency</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Édition 2026</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
