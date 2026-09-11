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

export default function MarketingPage() {
  return (
    <main className={styles.site}>
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
