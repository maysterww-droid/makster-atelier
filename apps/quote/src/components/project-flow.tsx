import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getMeasurementMessages } from '@/lib/i18n-measurements';
import { getPhase1Messages } from '@/lib/i18n-measurements-phase1';
import styles from './project-flow.module.css';

type StepKey = 'project' | 'measurements' | 'modules' | 'materials' | 'cost' | 'price' | 'proposal';
type Props = {
  projectId: string;
  locale: Locale;
  active: StepKey;
  measurementComplete: boolean;
  cabinetCount: number;
  completeCabinetCount: number;
  costReady: boolean;
  priceReady: boolean;
  proposalReady: boolean;
};
type Step = {
  key: StepKey;
  label: string;
  href: string;
  complete: boolean;
  blocked: boolean;
  meta: string;
  repairHref?: string;
};

export function ProjectFlow({ projectId, locale, active, measurementComplete, cabinetCount, completeCabinetCount, costReady, priceReady, proposalReady }: Props) {
  const m = getMeasurementMessages(locale);
  const p1 = getPhase1Messages(locale);
  const projectHref = `/projects/${projectId}`;
  const measurementHref = `${projectHref}/measurements`;
  const moduleHref = `${projectHref}#modules`;
  const materialsHref = `${projectHref}#materials`;
  const costHref = materialsHref;
  const priceHref = `${projectHref}#price`;
  const proposalHref = `${projectHref}/quote`;
  const materialsReady = cabinetCount > 0 && completeCabinetCount === cabinetCount;

  const automaticActive:StepKey = !measurementComplete
    ? 'measurements'
    : cabinetCount===0
      ? 'modules'
      : !materialsReady
        ? 'materials'
        : !costReady
          ? 'cost'
          : !priceReady
            ? 'price'
            : 'proposal';
  const resolvedActive = active==='project' ? automaticActive : active;

  const prerequisite = (target:StepKey) => {
    if (target === 'project' || target === 'measurements') return null;
    if (!measurementComplete) return { text:p1.blockedByMeasurements, href:measurementHref };
    if (target === 'modules') return null;
    if (cabinetCount === 0) return { text:p1.blockedByModules, href:moduleHref };
    if (target === 'materials') return null;
    if (!materialsReady) return { text:p1.blockedByMaterials, href:materialsHref };
    if (target === 'cost') return null;
    if (!costReady) return { text:p1.blockedByCost, href:costHref };
    if (target === 'price') return null;
    if (!priceReady) return { text:p1.blockedByPrice, href:priceHref };
    return null;
  };

  const rawSteps = [
    { key:'project', label:m.projectStep, href:projectHref, complete:true, meta:m.complete },
    { key:'measurements', label:m.measurementsStep, href:measurementHref, complete:measurementComplete, meta:measurementComplete?m.complete:m.notStarted },
    { key:'modules', label:m.modulesStep, href:moduleHref, complete:cabinetCount>0, meta:cabinetCount>0?`${cabinetCount}`:m.notStarted },
    { key:'materials', label:m.materialsStep, href:materialsHref, complete:materialsReady, meta:cabinetCount>0?`${completeCabinetCount}/${cabinetCount}`:m.notStarted },
    { key:'cost', label:m.costStep, href:costHref, complete:costReady, meta:costReady?m.complete:m.inProgress },
    { key:'price', label:m.priceStep, href:priceHref, complete:priceReady, meta:priceReady?m.complete:m.inProgress },
    { key:'proposal', label:m.proposalStep, href:proposalHref, complete:proposalReady, meta:proposalReady?m.complete:m.notStarted },
  ] as const;

  const steps:Step[] = rawSteps.map((step) => {
    const blocker = prerequisite(step.key);
    return {
      ...step,
      blocked:Boolean(blocker),
      meta:blocker?.text ?? step.meta,
      repairHref:blocker?.href,
    };
  });

  let nextText = p1.ready;
  let nextHref = projectHref;
  if (!measurementComplete) {
    nextText = p1.nextMeasurements;
    nextHref = measurementHref;
  } else if (cabinetCount === 0) {
    nextText = p1.nextModules;
    nextHref = moduleHref;
  } else if (!materialsReady) {
    nextText = `${p1.nextMaterials} ${p1.modulesIncomplete}: ${cabinetCount-completeCabinetCount}.`;
    nextHref = materialsHref;
  } else if (!costReady) {
    nextText = p1.nextCost;
    nextHref = costHref;
  } else if (!priceReady) {
    nextText = p1.nextPrice;
    nextHref = priceHref;
  } else if (!proposalReady) {
    nextText = p1.nextProposal;
    nextHref = proposalHref;
  }

  const remaining = steps.filter((step)=>step.key!=='project'&&!step.complete).length;
  const loadingLabel=locale==='ru'?'Переходим к этапу…':locale==='cs'?'Přecházíme na krok…':locale==='de'?'Schritt wird geöffnet…':locale==='pl'?'Przechodzimy do etapu…':'Opening step…';
  const nextLoadingLabel=locale==='ru'?'Переходим к следующему этапу…':locale==='cs'?'Přecházíme na další krok…':locale==='de'?'Nächster Schritt wird geöffnet…':locale==='pl'?'Przechodzimy do następnego etapu…':'Opening next step…';

  const guidanceContent = <>
    <strong>{remaining>0?p1.nextAction:p1.ready}</strong>
    <span>{nextText}</span>
    {remaining>0?<em>{p1.remaining}: {remaining}</em>:null}
    {remaining>0?<b>→</b>:null}
  </>;

  return <div className={styles.wrap}>
    <nav className={styles.flow} aria-label="Project workflow">
      {steps.map((step)=>{
        const href = step.blocked && step.repairHref ? step.repairHref : step.href;
        const isActive=resolvedActive===step.key;
        return <Link
          key={step.key}
          href={href}
          title={step.blocked?`${p1.blocked}: ${step.meta}`:step.meta}
          aria-current={isActive?'step':undefined}
          data-loading-label={loadingLabel}
          className={`${styles.step} ${step.complete?styles.complete:styles.incomplete} ${step.blocked?styles.blocked:''} ${isActive?styles.active:''}`}
        >
          <span className={styles.top}><i className={styles.dot}/><span className={styles.label}>{step.label}</span>{step.blocked?<span className={styles.lock} aria-hidden="true">×</span>:null}</span>
          <span className={styles.meta}>{step.meta}</span>
          {step.blocked?<span className={styles.fix}>{p1.fixHere} →</span>:null}
        </Link>;
      })}
    </nav>
    {remaining>0
      ? <Link href={nextHref} className={styles.guidance} data-loading-label={nextLoadingLabel}>{guidanceContent}</Link>
      : <div className={`${styles.guidance} ${styles.guidanceReady}`} role="status">{guidanceContent}</div>}
  </div>;
}
