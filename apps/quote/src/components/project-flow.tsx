import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getMeasurementMessages } from '@/lib/i18n-measurements';
import styles from './project-flow.module.css';

type Props = {
  projectId: string;
  locale: Locale;
  active: 'project' | 'measurements' | 'modules' | 'materials' | 'cost' | 'price' | 'proposal';
  measurementComplete: boolean;
  cabinetCount: number;
  completeCabinetCount: number;
  costReady: boolean;
  priceReady: boolean;
  proposalReady: boolean;
};

export function ProjectFlow({ projectId, locale, active, measurementComplete, cabinetCount, completeCabinetCount, costReady, priceReady, proposalReady }: Props) {
  const m = getMeasurementMessages(locale);
  const steps = [
    { key:'project', label:m.projectStep, href:`/projects/${projectId}`, complete:true, meta:m.complete },
    { key:'measurements', label:m.measurementsStep, href:`/projects/${projectId}/measurements`, complete:measurementComplete, meta:measurementComplete?m.complete:m.notStarted },
    { key:'modules', label:m.modulesStep, href:`/library?project=${projectId}`, complete:cabinetCount>0, meta:cabinetCount>0?`${cabinetCount}`:m.notStarted },
    { key:'materials', label:m.materialsStep, href:`/projects/${projectId}`, complete:cabinetCount>0&&completeCabinetCount===cabinetCount, meta:cabinetCount>0?`${completeCabinetCount}/${cabinetCount}`:m.notStarted },
    { key:'cost', label:m.costStep, href:`/projects/${projectId}`, complete:costReady, meta:costReady?m.complete:m.inProgress },
    { key:'price', label:m.priceStep, href:`/projects/${projectId}`, complete:priceReady, meta:priceReady?m.complete:m.inProgress },
    { key:'proposal', label:m.proposalStep, href:`/projects/${projectId}/quote`, complete:proposalReady, meta:proposalReady?m.complete:m.notStarted },
  ] as const;

  return <nav className={styles.flow} aria-label="Project workflow">
    {steps.map((step)=><Link key={step.key} href={step.href} className={`${styles.step} ${step.complete?styles.complete:''} ${active===step.key?styles.active:''}`}>
      <span className={styles.top}><i className={styles.dot}/><span className={styles.label}>{step.label}</span></span>
      <span className={styles.meta}>{step.meta}</span>
    </Link>)}
  </nav>;
}
