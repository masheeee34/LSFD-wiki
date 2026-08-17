'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { WikiRecord, InterventionPack } from '@/types';
import PackForm from '@/components/admin/PackForm';

export default function NewPackPage() {
  const router = useRouter();
  const [allRecords, setAllRecords] = useState<WikiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/records', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllRecords(data);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (packData: Omit<InterventionPack, 'id' | 'updatedAt'>) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de la création');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur inattendue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', paddingBottom: '48px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '13px' }} className="back-crumb">
            ← Retour à l'administration
          </Link>
          <span style={{ color: 'var(--color-text-muted)' }}>/</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '13px' }}>
            Nouveau Pack d'Intervention
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Créer un Pack / Classeur d'Intervention
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
          Regroupez plusieurs protocoles sous un seul classeur accessible avec navigation par onglets.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '10px 14px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12.5px',
        }}>
          {error}
        </div>
      )}

      <PackForm allRecords={allRecords} onSubmit={handleCreate} isLoading={isLoading} />

      <style>{`
        .back-crumb:hover {
          color: var(--color-text-primary) !important;
        }
      `}</style>
    </div>
  );
}
