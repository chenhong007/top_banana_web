'use client';

/**
 * PageHeader Component
 * Shared header component for static pages (About, Help, etc.)
 * Maintains consistent styling with the main site
 */

import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function PageHeader() {
  const locale = useLocale();
  const t = useTranslations('header');
  const nav = useTranslations('nav');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back to Home */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm hidden sm:inline">{nav('backToHome')}</span>
          </Link>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xl font-bold tracking-tight">
                <span className="gradient-text">{t('title')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </Link>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href={`/${locale}/about`}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              {nav('about')}
            </Link>
            <Link
              href={`/${locale}/help`}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              {nav('help')}
            </Link>
          </nav>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
