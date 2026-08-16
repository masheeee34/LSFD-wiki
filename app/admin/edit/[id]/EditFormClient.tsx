'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RecordForm from '@/components/admin/RecordForm';
import type { WikiRecord } from '@/types';

export default function EditFormClient({ initialData }: { initialData: WikiRecord }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Omit<WikiRecord, 'id' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/records/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour de la fiche');
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/admin" className="btn btn-secondary" style={{ fontSize: '12px' }}>
            ← Retour
          </Link>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Éditer : {initialData.title}
          </h1>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          REF: {initialData.id}
        </span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '16px',
          color: '#f87171',
          fontSize: '12.5px',
          fontFamily: 'var(--font-mono)',
        }}>
          {error}
        </div>
      )}

      <RecordForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
