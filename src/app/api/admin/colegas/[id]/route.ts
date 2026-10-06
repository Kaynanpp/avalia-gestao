import { NextRequest } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { deleteCoworker, saveCoworker } from '@/lib/peer/service';
import { coworkerSchema, peerIdSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireRH(); return peerResponse(await saveCoworker(peerIdSchema.parse((await params).id), coworkerSchema.parse(await readPeerJson(request)), actor)); }
  catch (error) { return peerErrorResponse(error); }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireRH(); await readPeerJson(request); await deleteCoworker(peerIdSchema.parse((await params).id), actor); return peerResponse({ deleted: true }); }
  catch (error) { return peerErrorResponse(error); }
}
