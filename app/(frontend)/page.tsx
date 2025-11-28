import { readPrompts } from '@/lib/storage';
import HomeClient from './HomeClient';

// Dynamic rendering to fetch data from database
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Read prompts from database
  const prompts = await readPrompts();

  return <HomeClient initialPrompts={prompts} />;
}
