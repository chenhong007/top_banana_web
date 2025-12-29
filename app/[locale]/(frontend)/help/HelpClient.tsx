'use client';

/**
 * HelpClient Component
 * Client component for the Help page
 * Features FAQ accordion, getting started guide, and tips section
 */

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Copy, 
  Eye, 
  ChevronDown, 
  Lightbulb, 
  Filter, 
  Wand2, 
  Cpu,
  MessageCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Footer } from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium pr-4">{question}</span>
        <ChevronDown 
          className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function HelpClient() {
  const t = useTranslations('helpPage');
  const footer = useTranslations('footer');
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const faqItems = [
    { q: t('faqItems.q1'), a: t('faqItems.a1') },
    { q: t('faqItems.q2'), a: t('faqItems.a2') },
    { q: t('faqItems.q3'), a: t('faqItems.a3') },
    { q: t('faqItems.q4'), a: t('faqItems.a4') },
    { q: t('faqItems.q5'), a: t('faqItems.a5') },
  ];

  return (
    <>
      <PageHeader />

      <main className="container pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-3xl animate-pulse-glow" />
            <div className="absolute right-1/3 bottom-1/4 h-80 w-80 rounded-full bg-accent/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-1.5 text-sm text-secondary animate-fade-in backdrop-blur-sm">
              <HelpCircle className="h-4 w-4" />
              <span>{t('title')}</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-text-blue">{t('heroTitle')}</span>
            </h1>

            <p className="text-lg text-muted-foreground md:text-xl animate-fade-in-up max-w-3xl mx-auto" style={{ animationDelay: '0.2s' }}>
              {t('heroDescription')}
            </p>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
              {t('gettingStartedTitle')}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card p-6 glass-card-hover group relative">
                <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 select-none">1</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('gettingStartedItems.item1Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('gettingStartedItems.item1Text')}
                </p>
              </div>

              <div className="glass-card p-6 glass-card-hover group relative">
                <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 select-none">2</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Search className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('gettingStartedItems.item2Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('gettingStartedItems.item2Text')}
                </p>
              </div>

              <div className="glass-card p-6 glass-card-hover group relative">
                <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 select-none">3</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4 group-hover:bg-accent/20 transition-colors">
                  <Copy className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('gettingStartedItems.item3Title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('gettingStartedItems.item3Text')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
              {t('faqTitle')}
            </h2>
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <FAQItem
                  key={index}
                  question={item.q}
                  answer={item.a}
                  isOpen={openFAQ === index}
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-center mb-12">
              {t('tipsTitle')}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex gap-4 p-5 glass-card glass-card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 flex-shrink-0">
                  <Filter className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('tipsItems.tip1Title')}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('tipsItems.tip1Text')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 glass-card glass-card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                  <Wand2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('tipsItems.tip2Title')}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('tipsItems.tip2Text')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 glass-card glass-card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 flex-shrink-0">
                  <Cpu className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('tipsItems.tip3Title')}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('tipsItems.tip3Text')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Still Need Help Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 md:p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl mb-4">
                {t('stillNeedHelpTitle')}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t('stillNeedHelpText')}
              </p>
              <div className="inline-block">
                <div className="relative w-64 h-24 rounded-xl overflow-hidden border border-border">
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
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
