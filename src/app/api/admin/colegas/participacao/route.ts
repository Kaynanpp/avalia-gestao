import { NextRequest } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { getPeerParticipation } from '@/lib/peer/service';
import { peerIdSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRH();
    const periodId = peerIdSchema.parse(request.nextUrl.searchParams.get('periodId'));
    return peerResponse(await getPeerParticipation(periodId));
  } catch (error) {
    return peerErrorResponse(error);
  }
}
