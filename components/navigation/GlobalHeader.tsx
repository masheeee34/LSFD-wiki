'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function GlobalHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        height: '56px',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Left: Logo & Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '30px', height: '30px', position: 'relative' }}>
                <Image
                  src="/lsfd-logo.png"
                  alt="LSFD EMS"
                  width={30}
                  height={30}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                LSFD <span style={{ color: 'var(--color-brand-red)' }}>Medilog</span>
              </span>
            </Link>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="topbar-nav-links">
              <Link href="/search?category=protocol" className="global-nav-link">Protocoles</Link>
              <Link href="/search?category=medication" className="global-nav-link">Pharmacologie</Link>
              <Link href="/search?category=maneuver" className="global-nav-link">Manœuvres</Link>
              <Link href="/search?category=equipment" className="global-nav-link">Matériel</Link>
              <Link href="/packs" className="global-nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span>📂</span>
                <span>Packs d'Intervention</span>
              </Link>
            </nav>
          </div>

          {/* Center: Search Trigger (Shortcut Bar) */}
          <div style={{ flex: '1 1 320px', maxWidth: '380px' }} className="header-search-bar">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'var(--color-text-muted)',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              className="global-search-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Rechercher protocole, molécule...</span>
              </div>
              <kbd style={{
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '3px',
                padding: '1px 5px',
                color: 'var(--color-text-faint)',
              }}>
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Theme Toggle + Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />

            <Link
              href="/admin"
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                fontWeight: 500,
                transition: 'all 120ms ease',
              }}
              className="global-admin-btn"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Global Search Modal Overlay */}
      {searchOpen && (
        <div
          onClick={() => setSearchOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '100px 20px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            <form onSubmit={handleSearchSubmit} style={{ margin: 0, display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans tout le référentiel LSFD..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'var(--color-brand-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Rechercher
              </button>
            </form>
            <div style={{ padding: '10px 16px', fontSize: '11.5px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tapez votre recherche et appuyez sur Entrée</span>
              <span>ESC pour fermer</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .global-nav-link {
          padding: 5px 10px;
          font-size: 12.5px;
          color: var(--color-text-secondary);
          text-decoration: none;
          border-radius: 5px;
          font-weight: 500;
          transition: all 120ms ease;
        }
        .global-nav-link:hover {
          color: var(--color-brand-blue);
          background-color: var(--color-bg-hover);
        }
        .global-search-btn:hover {
          border-color: var(--color-border-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .global-admin-btn:hover {
          color: var(--color-brand-blue) !important;
          border-color: var(--color-brand-blue) !important;
          background-color: var(--color-bg-hover) !important;
        }
        @media (max-width: 860px) {
          .topbar-nav-links {
            display: none !important;
          }
          .header-search-bar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
