type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

function errorDetails(error: unknown): LogContext {
  if (!(error instanceof Error)) return { errorType: 'UnknownError' };
  const code = (error as Error & { code?: unknown }).code;
  return {
    errorType: error.name || 'Error',
    ...(typeof code === 'string' ? { errorCode: code.slice(0, 100) } : {}),
  };
}

function write(level: 'info' | 'warn' | 'error', event: string, context: LogContext = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

export function logInfo(event: string, context: LogContext = {}) {
  write('info', event, context);
}

export function logWarning(event: string, context: LogContext = {}) {
  write('warn', event, context);
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  write('error', event, { ...context, ...errorDetails(error) });
}

export function requestIdFrom(headers: Headers) {
  const candidate = headers.get('x-request-id')?.trim();
  return candidate && /^[A-Za-z0-9._-]{8,100}$/.test(candidate) ? candidate : 'unavailable';
}
