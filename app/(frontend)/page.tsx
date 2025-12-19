import { promptRepository } from '@/repositories';
import HomeClient from './HomeClient';

// Dynamic rendering to fetch data from database
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Read prompts from database using repository
  const prompts = await promptRepository.findAll();

  return <HomeClient initialPrompts={prompts} />;
}
