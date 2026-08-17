'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InterventionPack, WikiRecord } from '@/types';
import PackForm from '@/components/admin/PackForm';

interface EditPackClientProps {
  pack: InterventionPack;
  allRecords: WikiRecord[];
}

export default function EditPackClient({ pack, allRecords }: EditPackClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (updatedData: Omit<InterventionPack, 'id' | 'updatedAt'>) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/packs/${pack.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de la mise à jour');
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
    <>
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

      <PackForm
        initialData={pack}
        allRecords={allRecords}
        onSubmit={handleUpdate}
        isLoading={isLoading}
      />
    </>
  );
}
