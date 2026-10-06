import { NextRequest } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { generatePeerLinks, getPeerLinks } from '@/lib/peer/service';
import { peerLinkSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';
import { consumeRateLimit, sensitiveActionRateLimitPolicy } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { await requireRH(); return peerResponse(await getPeerLinks()); }
  catch (error) { return peerErrorResponse(error); }
}
export async function POST(request: NextRequest) {
  try { const actor = await requireRH(); await consumeRateLimit('peer-link-create:actor', actor.id, sensitiveActionRateLimitPolicy()); return peerResponse(await generatePeerLinks(peerLinkSchema.parse(await readPeerJson(request)), actor), 201); }
  catch (error) { return peerErrorResponse(error); }
}
