import { readPrompts } from '@/lib/storage';
import HomeClient from './HomeClient';

// This ensures the page is statically generated at build time
export const dynamic = 'force-static';

export default function Home() {
  // Read prompts directly from file system during build
  const prompts = readPrompts();

  return <HomeClient initialPrompts={prompts} />;
}
