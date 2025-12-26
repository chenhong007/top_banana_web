'use client';

/**
 * HeroSection Component
 * Displays the main hero section with title and description
 */

import { useTranslations } from 'next-intl';

export default function HeroSection() {
  const t = useTranslations('hero');

  return (
    <div className="text-center mb-12 space-y-4">
      <h2 className="text-4xl md:text-5xl font-bold text-white animate-float tracking-tight drop-shadow-xl">
        {t('title')}
      </h2>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
        {t('description')}
      </p>
    </div>
  );
}
