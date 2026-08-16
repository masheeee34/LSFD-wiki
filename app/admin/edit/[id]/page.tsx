import { notFound } from 'next/navigation';
import { getById } from '@/lib/store';
import EditFormClient from './EditFormClient';

export const metadata = { title: 'Éditer le protocole — LSFD Medilog' };

export default async function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getById(id);
  
  if (!record) {
    notFound();
  }

  return <EditFormClient initialData={record} />;
}
