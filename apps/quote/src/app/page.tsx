import {
  FAQSection,
  FeaturesSection,
  FinalCTA,
  MarketingFooter,
  MarketingHeader,
  PricingSection,
} from '@/components/marketing-sections';
import { PremiumHero } from '@/components/premium-hero';
import { ConversionSuite } from '@/components/conversion-suite';
import { LuxuryVisual } from '@/components/luxury-visual';
import { ProductDemo } from '@/components/product-demo';
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
      <ProductDemo />
      <LuxuryVisual />
      <FeaturesSection />
      <ConversionSuite />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
