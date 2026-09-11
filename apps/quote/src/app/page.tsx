import {
  FAQSection,
  FinalCTA,
  MarketingFooter,
  MarketingHeader,
} from '@/components/marketing-sections';
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

export default function MarketingPage() {
  return (
    <main className={`${styles.site} mq-premium`}>
      <MarketingHeader />
      <PremiumHero />
      <EmbeddedQuote />
      <LuxuryVisual />
      <VisualStory />
      <SalesPricing />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
