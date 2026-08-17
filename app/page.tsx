import { getAll } from '@/lib/store';
import HomeSearchHub from './HomeSearchHub';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const records = await getAll();
  return <HomeSearchHub allRecords={records} />;
}
