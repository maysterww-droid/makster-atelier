export type QaCode =
  | 'OBVIOUS_AI_ARTIFACT' | 'PRODUCT_DRIFT' | 'CONTINUITY_ERROR'
  | 'BAD_TYPOGRAPHY' | 'BRAND_VIOLATION' | 'LOW_PREMIUM_SCORE'
  | 'UNSUPPORTED_CLAIM' | 'INVENTED_UI';

export type QaFinding = { code: QaCode; severity: 'BLOCK' | 'WARN'; note?: string };
export type QaResult = { passed: boolean; blocking: QaFinding[]; warnings: QaFinding[] };

export function premiumQaGate(findings: QaFinding[]): QaResult {
  const blocking = findings.filter(f => f.severity === 'BLOCK');
  const warnings = findings.filter(f => f.severity === 'WARN');
  return { passed: blocking.length === 0, blocking, warnings };
}

export function mayEnterHumanApproval(result: QaResult): boolean {
  return result.passed;
}
