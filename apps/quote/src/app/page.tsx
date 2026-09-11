import {
  FAQSection,
  FeaturesSection,
  FinalCTA,
  HeroSection,
  MarketingFooter,
  MarketingHeader,
  PricingSection,
  ProductSection,
  WorkflowSection,
} from '@/components/marketing-sections';
import { MarketingStorytellingSuite } from '@/components/marketing-storytelling';
import styles from './marketing.module.css';
import './premium.css';
import './warm-cleanup.css';

export default function MarketingPage() {
  return (
    <main className={`${styles.site} mq-premium`}>
      <MarketingHeader />
      <HeroSection />
      <WorkflowSection />
      <ProductSection />
      <MarketingStorytellingSuite />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
