'use client';

/**
 * HeroSection Component
 * Displays the main hero section with title and description
 * Enhanced with modern animations and gradients
 */

import { useTranslations } from 'next-intl';
import { Sparkles, Zap, Palette, Wand2 } from 'lucide-react';

export default function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
        <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-secondary/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary animate-fade-in backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t('badge')}</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('titlePart1')} <span className="gradient-text">{t('titleHighlight')}</span> {t('titlePart2')}
          </h1>
          
          <p className="text-lg text-muted-foreground md:text-xl animate-fade-in-up max-w-3xl mx-auto" style={{ animationDelay: '0.2s' }}>
            {t('description')}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-sm">{t('category1')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-secondary" />
              <span className="text-sm">{t('category2')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm">{t('category3')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
              <Wand2 className="h-4 w-4 text-orange-400" />
              <span className="text-sm">{t('category4')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
