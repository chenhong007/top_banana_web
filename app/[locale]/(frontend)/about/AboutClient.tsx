'use client';

/**
 * AboutClient Component
 * Client component for the About page
 * Features modern glass effects and animations consistent with the main site
 */

import { useTranslations } from 'next-intl';
import { Target, Sparkles, RefreshCw, Share2, Award, Lightbulb, Layers, Cpu, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Footer } from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';

export default function AboutClient() {
  const t = useTranslations('aboutPage');
  const footer = useTranslations('footer');

  return (
    <>
      <PageHeader />

      <main className="container pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
            <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-secondary/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary animate-fade-in backdrop-blur-sm">
              <Target className="h-4 w-4" />
              <span>{t('title')}</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-text">{t('heroTitle')}</span>
            </h1>

            <p className="text-lg text-muted-foreground md:text-xl animate-fade-in-up max-w-3xl mx-auto" style={{ animationDelay: '0.2s' }}>
              {t('heroDescription')}
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 md:p-12 glass-card-hover">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('missionTitle')}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {t('missionText')}
              </p>
            </div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
              {t('whatWeDoTitle')}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card p-6 glass-card-hover group">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('whatWeDoItems.item1Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('whatWeDoItems.item1Text')}
                </p>
              </div>

              <div className="glass-card p-6 glass-card-hover group">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Layers className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('whatWeDoItems.item2Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('whatWeDoItems.item2Text')}
                </p>
              </div>

              <div className="glass-card p-6 glass-card-hover group">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4 group-hover:bg-accent/20 transition-colors">
                  <RefreshCw className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('whatWeDoItems.item3Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('whatWeDoItems.item3Text')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
              {t('valuesTitle')}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-6 group">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Share2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('valuesItems.value1Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('valuesItems.value1Text')}
                </p>
              </div>

              <div className="text-center p-6 group">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-blue mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('valuesItems.value2Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('valuesItems.value2Text')}
                </p>
              </div>

              <div className="text-center p-6 group">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('valuesItems.value3Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('valuesItems.value3Text')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl mb-4">
              {t('contactTitle')}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t('contactText')}
            </p>
            <div className="glass-card p-6 inline-block">
              <div className="relative w-64 h-24 rounded-xl overflow-hidden">
                <OptimizedImage
                  src="/api/images/static/contact.png"
                  alt={footer('contactAlt')}
                  fill
                  sizes="256px"
                  objectFit="contain"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
