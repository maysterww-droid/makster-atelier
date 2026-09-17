import { premiumQaGate, type QaFinding, type QaResult } from './premium-qa';

export type QaReport = { project_id: string; generated_at: string; result: QaResult; checks: { name: string; passed: boolean; findings: QaFinding[] }[] };

export function buildQaReport(projectId: string, checks: QaReport['checks'], now = new Date().toISOString()): QaReport {
  const findings = checks.flatMap(c => c.findings);
  return { project_id: projectId, generated_at: now, result: premiumQaGate(findings), checks };
}
