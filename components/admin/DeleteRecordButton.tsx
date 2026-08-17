'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteRecordButton({ id, title }: { id: string; title: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la fiche "${title}" ?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Erreur lors de la suppression de la fiche.');
      }
    } catch {
      alert('Erreur réseau lors de la communication avec le serveur.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        fontSize: '12px',
        fontWeight: 500,
        color: '#f87171',
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        padding: '4px 10px',
        borderRadius: '4px',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        opacity: isDeleting ? 0.6 : 1,
        transition: 'all 120ms ease',
      }}
      className="btn-delete-action"
    >
      {isDeleting ? 'Suppression...' : 'Supprimer'}
    </button>
  );
}
