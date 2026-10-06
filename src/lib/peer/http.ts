import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { rateLimitHeaders, RateLimitExceededError } from '@/lib/security/rate-limit';
import { logError, requestIdFrom } from '@/lib/observability/logger';

export class PeerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function assertPeerOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    let sameOrigin = false;
    try {
      const originUrl = new URL(origin);
      const forwardedProtocol = process.env.TRUST_PROXY === 'true'
        ? request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
        : undefined;
      const requestProtocol = forwardedProtocol ? `${forwardedProtocol}:` : request.nextUrl.protocol;
      sameOrigin = originUrl.host === request.headers.get('host') && originUrl.protocol === requestProtocol;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) throw new PeerError('Origem da solicitação não permitida.', 403);
  }
}

export async function readPeerJson(request: NextRequest, maximum = 12000): Promise<unknown> {
  assertPeerOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new PeerError('Envie os dados no formato JSON.', 415);
  if (Number(request.headers.get('content-length') || 0) > maximum) throw new PeerError('O conteúdo enviado é muito grande.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PeerError('Dados ausentes.');
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new PeerError('O conteúdo enviado é muito grande.', 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new PeerError('Dados inválidos.'); }
}

export function peerResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export function peerErrorResponse(error: unknown, request?: NextRequest) {
  let status = 500, message = 'Não foi possível concluir a operação. Tente novamente.';
  if (error instanceof RateLimitExceededError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 429, headers: rateLimitHeaders(error) },
    );
  }
  if (error instanceof PeerError) { status = error.status; message = error.message; }
  else if (error instanceof ZodError) { status = 400; message = error.errors.map((entry) => entry.message).join(' '); }
  else if (error instanceof Error && error.message === 'Não autenticado') { status = 401; message = 'Entre novamente para continuar.'; }
  else if (error instanceof Error && (error.message.startsWith('Acesso negado') || error.message === 'Troca de senha obrigatória')) { status = 403; message = 'Acesso restrito ao RH/ADMIN com senha atualizada.'; }
  if (status === 500) {
    logError('api_request_failed', error, {
      requestId: request ? requestIdFrom(request.headers) : 'unavailable',
    });
  }
  return NextResponse.json({ success: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
