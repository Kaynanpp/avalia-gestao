import { NextRequest } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { getPeerManagementData, saveCoworker } from '@/lib/peer/service';
import { coworkerSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { await requireRH(); return peerResponse(await getPeerManagementData()); }
  catch (error) { return peerErrorResponse(error); }
}
export async function POST(request: NextRequest) {
  try { const actor = await requireRH(); return peerResponse(await saveCoworker(null, coworkerSchema.parse(await readPeerJson(request)), actor), 201); }
  catch (error) { return peerErrorResponse(error); }
}
