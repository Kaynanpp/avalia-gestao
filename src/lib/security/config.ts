export function productionConfigurationIssues() {
  if (process.env.NODE_ENV !== 'production') return [];
  const issues: string[] = [];
  if (!process.env.PARTICIPATION_SECRET || process.env.PARTICIPATION_SECRET.trim().length < 32) {
    issues.push('participation-secret');
  }
  const rateLimitSecret = process.env.RATE_LIMIT_SECRET?.trim() || process.env.PARTICIPATION_SECRET?.trim();
  if (!rateLimitSecret || rateLimitSecret.length < 32) issues.push('rate-limit-secret');
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') issues.push('firebase-emulator');
  return issues;
}

export function assertProductionSecurityConfiguration() {
  const issues = productionConfigurationIssues();
  if (issues.length) throw new Error(`Configuração de produção incompleta: ${issues.join(', ')}`);
}
