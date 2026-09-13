import { t, type Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import { getMarketingOrigin, getMarketingSeoText } from '@/lib/marketing-seo';
import { FAQSection, FinalCTA } from '@/components/marketing-sections';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PremiumHero } from '@/components/premium-hero';
import { LuxuryVisual } from '@/components/luxury-visual';
import { EmbeddedQuote } from '@/components/embedded-quote';
import { SalesPricing } from '@/components/sales-sections';
import { VisualStory } from '@/components/visual-story';
import styles from './marketing.module.css';
import './premium.css';
import './warm-cleanup-v2.css';
import './premium-polish.css';
import './luxury-pass.css';
import './clarity-pass.css';
import './visual-hook.css';
import './product-demo-first.css';
import './product-demo-mobile.css';
import './sales-visibility-fix.css';
import './mobile-experience-v2.css';

export function MarketingPageContent({ locale, canonicalPath = `/${locale}` }: { locale: Locale; canonicalPath?: string }) {
  const seo = getMarketingSeoText(locale);
  const marketing = getMarketingMessages(locale);
  const embeddedCopy = {
    demo: marketing.demo,
    openQuote: marketing.nav.openQuote,
    documents: marketing.hero.documents,
    app: {
      dashboard: t(locale, 'dashboard'),
      newQuote: t(locale, 'newQuote'),
      priceBook: t(locale, 'priceBook'),
      cabinetLibrary: t(locale, 'cabinetLibrary'),
      plan: t(locale, 'plan'),
      statusActive: t(locale, 'statusActive'),
      trueCost: t(locale, 'trueCost'),
      clientQuote: t(locale, 'clientQuote'),
      materials: t(locale, 'materials'),
      hardware: t(locale, 'hardware'),
      labour: t(locale, 'labour'),
      overhead: t(locale, 'overhead'),
      margin: t(locale, 'margin'),
      sellingPrice: t(locale, 'sellingPrice'),
      installation: t(locale, 'installation'),
    },
  };
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Makster Quote',
    url: `${getMarketingOrigin()}${canonicalPath}`,
    description: seo.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: locale,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CZK',
      description: marketing.pricing.pilotTitle,
    },
  };

  return (
    <main className={`${styles.site} mq-premium`} lang={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <SiteHeader locale={locale} />
      <PremiumHero locale={locale} />
      <EmbeddedQuote copy={embeddedCopy} />
      <LuxuryVisual locale={locale} />
      <VisualStory locale={locale} />
      <SalesPricing locale={locale} />
      <FAQSection locale={locale} />
      <FinalCTA locale={locale} />
      <SiteFooter locale={locale} />
    </main>
  );
}
