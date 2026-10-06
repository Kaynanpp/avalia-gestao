import Link from 'next/link';
import { requireRH } from '@/lib/services/auth.service';
import { getAuditLogs } from '@/lib/services/audit.service';
import { AuditHistory } from '@/components/admin/audit-history';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const user = await requireRH();
  if (user.role !== 'ADMIN') return <div className="rounded-xl border bg-white p-8"><h1 className="text-xl font-bold">Acesso reservado à administração</h1><Link href="/admin" className="mt-4 inline-block text-orange-600">Voltar ao painel</Link></div>;
  const logs = await getAuditLogs({ limit: 200 });
  return <AuditHistory entries={logs.map((log) => ({ id: log.id, description: log.description, actor: log.performedByName || (log.performedBy === 'SYSTEM' ? 'Sistema' : 'Administrador'), entity: log.entityType, createdAt: log.createdAt.toISOString() }))} />;
}
