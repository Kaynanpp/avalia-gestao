import { createHash, createHmac, timingSafeEqual } from 'crypto';

export type ParticipationKind = 'LEADERSHIP' | 'PEER';

export type ParticipationTokenPayload = {
  v: 1;
  kind: ParticipationKind;
  participantId: string;
  departmentId: string;
  periodId: string;
  exp: number;
};

export class ParticipationTokenError extends Error {}

function configuredSources(): string[] {
  const primary = process.env.PARTICIPATION_SECRET?.trim();
  if (process.env.NODE_ENV === 'production' && (!primary || primary.length < 32)) {
    throw new ParticipationTokenError('PARTICIPATION_SECRET deve ter pelo menos 32 caracteres em produção.');
  }
  const legacy = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const previous = (process.env.PARTICIPATION_PREVIOUS_SECRETS || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (previous.some((value) => value.length < 32)) throw new ParticipationTokenError('Segredos anteriores de participação inválidos.');
  const emulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
    ? `emulator:${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-avalia-gestao'}`
    : '';
  const sources = [primary, ...previous, legacy, emulator].filter((value): value is string => Boolean(value));
  if (!sources.length) throw new ParticipationTokenError('O controle de participação não está configurado.');
  return [...new Set(sources)];
}

function key(source: string) {
  // Keep the same derivation previously used by peer evaluations so a dedicated
  // secret can be introduced without invalidating legacy participation records.
  return createHash('sha256').update(source).digest();
}

function hashWithSource(value: string, source: string) {
  return createHmac('sha256', key(source)).update(value).digest('hex');
}

export function primaryParticipationHash(value: string) {
  return hashWithSource(value, configuredSources()[0]);
}

/** Current and legacy hashes, used during safe secret rotation. */
export function participationHashCandidates(value: string) {
  return [...new Set(configuredSources().map((source) => hashWithSource(value, source)))];
}

export function signParticipationToken(payload: Omit<ParticipationTokenPayload, 'v' | 'exp'>, ttlMs = 2 * 60 * 60 * 1000) {
  const complete: ParticipationTokenPayload = { ...payload, v: 1, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(complete)).toString('base64url');
  const signature = createHmac('sha256', key(configuredSources()[0])).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyParticipationToken(token: string, expectedKind: ParticipationKind): ParticipationTokenPayload {
  const [encoded, provided, extra] = token.split('.');
  if (!encoded || !provided || extra) throw new ParticipationTokenError('Sua identificação expirou. Informe a matrícula novamente.');
  let received: Buffer;
  try { received = Buffer.from(provided, 'base64url'); }
  catch { throw new ParticipationTokenError('Sua identificação expirou. Informe a matrícula novamente.'); }
  const validSignature = configuredSources().some((source) => {
    const expected = createHmac('sha256', key(source)).update(encoded).digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
  if (!validSignature) throw new ParticipationTokenError('Sua identificação expirou. Informe a matrícula novamente.');
  let payload: ParticipationTokenPayload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ParticipationTokenPayload; }
  catch { throw new ParticipationTokenError('Sua identificação expirou. Informe a matrícula novamente.'); }
  if (payload.v !== 1 || payload.kind !== expectedKind || !payload.participantId || !payload.departmentId || !payload.periodId || payload.exp <= Date.now()) {
    throw new ParticipationTokenError('Sua identificação expirou. Informe a matrícula novamente.');
  }
  return payload;
}
