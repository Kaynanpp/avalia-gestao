/**
 * Utility functions for AvaliaGestão
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// ── Tailwind ──────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Dates ─────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return formatInTimeZone(d, 'America/Sao_Paulo', 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return formatInTimeZone(d, 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return formatInTimeZone(d, 'America/Sao_Paulo', 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Converts Firestore Timestamp or Date-like objects to JS Date
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp
  if (typeof value === 'object' && 'toDate' in (value as object)) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string') {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  return null;
}

// ── Numbers ───────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-';
  return score.toFixed(1);
}

export function formatDifference(diff: number | null | undefined): string {
  if (diff === null || diff === undefined) return '-';
  const prefix = diff > 0 ? '+' : '';
  return `${prefix}${diff.toFixed(1)}`;
}

// ── String utilities ──────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Period Status Labels ──────────────────────────────────────

export const PERIOD_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Planejado',
  OPEN: 'Aberto',
  CLOSED: 'Encerrado',
};

export const PERIOD_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
};

export const MANAGER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export const EVALUATION_TYPE_LABELS: Record<string, string> = {
  TEAM: 'Equipe',
  SELF: 'Autoavaliação',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RH: 'RH/DP',
};

// ── Token generation ──────────────────────────────────────────

/**
 * Generates a cryptographically secure random token
 * Used for self-evaluation access links
 */
export function generateSecureToken(length: number = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (const byte of array) {
      result += chars[byte % chars.length];
    }
  } else {
    // Node.js fallback (server-side)
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(length);
    for (const byte of bytes) {
      result += chars[byte % chars.length];
    }
  }
  
  return result;
}

/**
 * Generates an anonymous submission token for rate limiting
 * This is NOT tied to user identity - just prevents accidental duplicate submissions
 */
export function generateSubmissionToken(): string {
  return `anon_${generateSecureToken(32)}_${Date.now()}`;
}

// ── Error handling ────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocorreu um erro inesperado';
}

// ── Score helpers ─────────────────────────────────────────────

export const SCORE_LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Precisa melhorar',
  3: 'Adequado',
  4: 'Muito bom',
  5: 'Excelente',
};

export const SCORE_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#16a34a',
};

export function getScoreColor(score: number | null): string {
  if (!score) return '#94a3b8';
  if (score >= 4.5) return '#16a34a';
  if (score >= 3.5) return '#22c55e';
  if (score >= 2.5) return '#eab308';
  if (score >= 1.5) return '#f97316';
  return '#ef4444';
}

// ── Sanitization ──────────────────────────────────────────────

export function sanitizeComment(comment: string | undefined | null): string | undefined {
  if (!comment) return undefined;
  return comment.trim().slice(0, 1000) || undefined;
}
