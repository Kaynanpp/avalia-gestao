import { NextRequest } from 'next/server';
import { getPeerAccessContext } from '@/lib/peer/service';
import { peerAccessSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';
import { normalizeRegistration } from '@/lib/peer/types';
import { enforceRequestRateLimit, identificationRateLimitPolicy } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const input = peerAccessSchema.parse(await readPeerJson(request));
    await enforceRequestRateLimit(
      request,
      'peer-identification',
      normalizeRegistration(input.registration),
      identificationRateLimitPolicy(),
    );
    return peerResponse(await getPeerAccessContext(input));
  } catch (error) {
    return peerErrorResponse(error, request);
  }
}
