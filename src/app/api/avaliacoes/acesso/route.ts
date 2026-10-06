import { NextRequest } from 'next/server';
import { getLeadershipAccessContext } from '@/lib/leadership/service';
import { leadershipAccessSchema } from '@/lib/validators';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';
import { normalizeRegistration } from '@/lib/peer/types';
import { enforceRequestRateLimit, identificationRateLimitPolicy } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const input = leadershipAccessSchema.parse(await readPeerJson(request));
    await enforceRequestRateLimit(
      request,
      'leadership-identification',
      normalizeRegistration(input.registration),
      identificationRateLimitPolicy(),
    );
    return peerResponse(await getLeadershipAccessContext(input));
  } catch (error) {
    return peerErrorResponse(error, request);
  }
}
