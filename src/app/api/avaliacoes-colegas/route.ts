import { NextRequest } from 'next/server';
import { submitOpenPeerEvaluation } from '@/lib/peer/service';
import { openPeerSubmissionSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';
import { consumeRateLimit, sensitiveActionRateLimitPolicy } from '@/lib/security/rate-limit';
import { verifyParticipationToken, ParticipationTokenError } from '@/lib/participation-security';
import { PeerError } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const input = openPeerSubmissionSchema.parse(await readPeerJson(request));
    const identity = verifyParticipationToken(input.participationToken, 'PEER');
    await consumeRateLimit('peer-submission:participant', identity.participantId, sensitiveActionRateLimitPolicy());
    return peerResponse(await submitOpenPeerEvaluation(input), 201);
  } catch (error) {
    return peerErrorResponse(error instanceof ParticipationTokenError ? new PeerError(error.message, 401) : error, request);
  }
}
