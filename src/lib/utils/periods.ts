/** Calendar dates are interpreted in the company's timezone, including the entire last day. */
export function parsePeriodDate(value: string, endOfDay = false): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`);
    // Reject impossible calendar dates such as 2026-02-31.
    const check = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(check.getTime()) || check.toISOString().slice(0, 10) !== value) return new Date(NaN);
    return date;
  }
  return new Date(value);
}

export function normalizeStoredPeriodDate(date: Date, endOfDay = false): Date {
  // Earlier versions saved date-only inputs at midnight UTC.
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
    return parsePeriodDate(date.toISOString().slice(0, 10), endOfDay);
  }
  return date;
}

export function isPeriodAcceptingResponses(
  period: { status: string; startDate: Date; endDate: Date },
  now: number = Date.now()
): boolean {
  return period.status === 'OPEN' &&
    now >= normalizeStoredPeriodDate(period.startDate).getTime() &&
    now <= normalizeStoredPeriodDate(period.endDate, true).getTime();
}
