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
import styles from './marketing.module.css';
import './premium.css';

export default function MarketingPage() {
  return (
    <main className={`${styles.site} mq-premium`}>
      <MarketingHeader />
      <HeroSection />
      <WorkflowSection />
      <ProductSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
