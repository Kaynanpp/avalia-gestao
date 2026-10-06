import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { toDate } from '@/lib/utils';
import { PRODUCT } from '@/lib/product';

async function readSettings() {
  const doc = await adminDb.collection(COLLECTIONS.SETTINGS).doc('app').get();
  if (!doc.exists) {
    return {
      companyName: 'Empresa',
      appName: PRODUCT.name,
      minEvaluationsForDisplay: 5,
      commentsEnabled: true,
      defaultPeriodId: null,
      updatedAt: new Date(),
    };
  }
  const data = doc.data()!;
  return {
    companyName: data.companyName || 'Empresa',
    appName: !data.appName || data.appName === 'AvaliaGestão' ? PRODUCT.name : data.appName,
    minEvaluationsForDisplay: data.minEvaluationsForDisplay || 5,
    commentsEnabled: data.commentsEnabled ?? true,
    defaultPeriodId: data.defaultPeriodId || null,
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

// Server Components frequently request settings in both the layout and page.
// React cache deduplicates that Firestore read inside the same request only.
export const getSettings = cache(readSettings);

export async function updateSettings(
  settings: Partial<{
    companyName: string;
    appName: string;
    minEvaluationsForDisplay: number;
    commentsEnabled: boolean;
    defaultPeriodId: string | null;
  }>,
  performedBy: string
) {
  await adminDb.collection(COLLECTIONS.SETTINGS).doc('app').set({
    ...settings,
    updatedAt: new Date(),
    updatedBy: performedBy,
  }, { merge: true });
}
