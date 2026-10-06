import { NextRequest } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { cancelPeerLink } from '@/lib/peer/service';
import { peerIdSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireRH(); await readPeerJson(request); await cancelPeerLink(peerIdSchema.parse((await params).id), actor); return peerResponse({ cancelled: true }); }
  catch (error) { return peerErrorResponse(error); }
}
