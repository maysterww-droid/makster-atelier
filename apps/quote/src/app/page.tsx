import {
  FAQSection,
  FeaturesSection,
  FinalCTA,
  MarketingFooter,
  MarketingHeader,
  PricingSection,
  ProductSection,
} from '@/components/marketing-sections';
import { MarketingStorytellingSuite } from '@/components/marketing-storytelling';
import { PremiumHero } from '@/components/premium-hero';
import { ConversionSuite } from '@/components/conversion-suite';
import { LuxuryVisual } from '@/components/luxury-visual';
import { VisualWorkflow } from '@/components/visual-workflow';
import styles from './marketing.module.css';
import './premium.css';
import './warm-cleanup-v2.css';
import './premium-polish.css';
import './luxury-pass.css';
import './clarity-pass.css';
import './visual-hook.css';

export default function MarketingPage() {
  return (
    <main className={`${styles.site} mq-premium`}>
      <MarketingHeader />
      <PremiumHero />
      <VisualWorkflow />
      <ProductSection />
      <LuxuryVisual />
      <MarketingStorytellingSuite />
      <FeaturesSection />
      <ConversionSuite />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
