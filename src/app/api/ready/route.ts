import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, SETTINGS_DOC_ID } from '@/lib/firebase/collections';
import { logError, requestIdFrom } from '@/lib/observability/logger';
import { assertProductionSecurityConfiguration } from '@/lib/security/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request.headers);
  try {
    assertProductionSecurityConfiguration();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        adminDb.collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_ID).get(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('ReadinessTimeout')), 5000); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return NextResponse.json(
      { status: 'ready' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logError('readiness_check_failed', error, { requestId });
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } },
    );
  }
}
