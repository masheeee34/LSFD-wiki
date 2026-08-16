import { getAll } from '@/lib/store';
import HomeSearchHub from './HomeSearchHub';

export default async function HomePage() {
  const records = await getAll();
  return <HomeSearchHub allRecords={records} />;
}
