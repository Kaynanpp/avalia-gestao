'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PeerPeriod } from '@/lib/peer/types';
import { fieldClass, peerApi } from './shared';

type Participation = {
  eligible: number;
  participants: number;
  evaluations: number;
  participationPercent: number;
  privacy: string;
};

export function PeerParticipationPanel({ periods }: { periods: PeerPeriod[] }) {
  const [periodId, setPeriodId] = useState(periods.find((period) => period.status === 'OPEN')?.id || periods[0]?.id || '');
  const [data, setData] = useState<Participation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    peerApi<Participation>(`/api/admin/colegas/participacao?periodId=${encodeURIComponent(periodId)}`)
      .then(setData)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a participação.'))
      .finally(() => setLoading(false));
  }, [periodId]);

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-lg font-semibold text-slate-900">Participação entre colegas</h2><p className="mt-1 text-sm text-slate-500">Acompanhe a adesão geral sem identificar os participantes.</p></div>
      <label className="min-w-64 text-sm font-medium">Período<select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className={`${fieldClass} mt-1`}>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
    </div>
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mr-2 inline h-4 w-4" />A identidade de participação fica separada do conteúdo anônimo. Esta tela apresenta somente totais agregados.</div>
    {loading ? <p className="p-10 text-center text-sm text-slate-500">Carregando participação...</p> : data && <>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Colaboradores elegíveis" value={data.eligible} /><Metric label="Participantes" value={data.participants} /><Metric label="Participação" value={`${data.participationPercent}%`} detail={`${data.evaluations} avaliações concluídas`} /></div>
      <div className="rounded-xl border bg-white p-5 text-sm text-slate-600"><p className="font-medium text-slate-900">Privacidade preservada</p><p className="mt-1">{data.privacy}</p>{data.evaluations === 0 && <p className="mt-3">Ainda não há participação registrada neste período.</p>}</div>
    </>}
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}
