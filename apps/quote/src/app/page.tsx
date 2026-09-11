import {
  FAQSection,
  FeaturesSection,
  FinalCTA,
  MarketingFooter,
  MarketingHeader,
  PricingSection,
  ProductSection,
  WorkflowSection,
} from '@/components/marketing-sections';
import { MarketingStorytellingSuite } from '@/components/marketing-storytelling';
import { PremiumHero } from '@/components/premium-hero';
import { ConversionSuite } from '@/components/conversion-suite';
import { LuxuryVisual } from '@/components/luxury-visual';
import styles from './marketing.module.css';
import './premium.css';
import './warm-cleanup-v2.css';
import './premium-polish.css';
import './luxury-pass.css';

export default function MarketingPage() {
  return (
    <main className={`${styles.site} mq-premium`}>
      <MarketingHeader />
      <PremiumHero />
      <LuxuryVisual />
      <WorkflowSection />
      <ProductSection />
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
