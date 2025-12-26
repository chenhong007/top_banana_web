import { promptRepository } from '@/repositories';
import { setRequestLocale } from 'next-intl/server';
import HomeClient from './HomeClient';

// Dynamic rendering to fetch data from database
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  
  // Enable static rendering
  setRequestLocale(locale);

  // Read prompts from database using repository
  const prompts = await promptRepository.findAll();

  return <HomeClient initialPrompts={prompts} />;
}
