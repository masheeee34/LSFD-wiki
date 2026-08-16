import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { verifyPassword, signSession, SESSION_PAYLOAD, SESSION_COOKIE } from '@/lib/auth';

export const metadata = { title: 'Authentification — LSFD Medilog' };

async function authenticate(formData: FormData) {
  'use server';
  const password = formData.get('password') as string;
  const isValid = verifyPassword(password);
  if (isValid) {
    const token = signSession(SESSION_PAYLOAD);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: 28800,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    redirect('/admin');
  } else {
    redirect('/admin/login?error=1');
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hasError = error === '1';

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="linear-card" style={{
        width: '100%',
        maxWidth: '380px',
        padding: '28px',
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        boxShadow: 'var(--card-shadow)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Terminal Header */}
        <div style={{ marginBottom: '22px', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 10px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src="/lsfd-logo.png"
              alt="LSFD Logo"
              width={56}
              height={56}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '2px' }}>
            LSFD <span style={{ color: 'var(--color-brand-red)' }}>Medilog</span>
          </h1>
          <p style={{
            fontSize: '12.5px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
            margin: 0,
          }}>
            Administration médicale LSFD EMS
          </p>
        </div>

        {hasError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '12.5px',
            marginBottom: '16px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
          }}>
            Mot de passe administrateur incorrect.
          </div>
        )}

        <form action={authenticate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12.5px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
              marginBottom: '6px',
            }}>
              Clé d'accès superviseur
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              autoFocus
              autoComplete="current-password"
              className="input"
              style={{ padding: '9px 12px', fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Déverrouiller le portail
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
        }}>
          <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500 }} className="return-link">
            ← Retour au registre
          </Link>
          <span>Accès réservé ALS</span>
        </div>
      </div>

      <style>{`
        .return-link:hover {
          color: var(--color-brand-red) !important;
        }
      `}</style>
    </div>
  );
}
