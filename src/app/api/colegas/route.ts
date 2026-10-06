import { NextRequest } from 'next/server';
import { submitPeerEvaluation } from '@/lib/peer/service';
import { peerSubmissionSchema } from '@/lib/peer/validation';
import { peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try { return peerResponse(await submitPeerEvaluation(peerSubmissionSchema.parse(await readPeerJson(request))), 201); }
  catch (error) { return peerErrorResponse(error); }
}
