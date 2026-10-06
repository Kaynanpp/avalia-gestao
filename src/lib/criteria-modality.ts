import type { EvaluationModality } from '@/types';

export type FormModality = Exclude<EvaluationModality, 'BOTH'>;

/**
 * Decides whether a criterion belongs to a form. Records created before
 * modalities existed are leadership criteria for backward compatibility.
 */
export function criterionMatchesModality(value: unknown, requested: FormModality): boolean {
  const modality: EvaluationModality = value === 'PEER' || value === 'BOTH'
    ? value
    : 'LEADERSHIP';
  return modality === requested || modality === 'BOTH';
}
