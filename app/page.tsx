import { getAll, getPacks } from '@/lib/store';
import HomeSearchHub from './HomeSearchHub';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [records, packs] = await Promise.all([getAll(), getPacks()]);
  return <HomeSearchHub allRecords={records} allPacks={packs} />;
}
