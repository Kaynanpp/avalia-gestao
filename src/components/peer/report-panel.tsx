'use client';

import { useEffect, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PeerPeriod, PeerReport } from '@/lib/peer/types';
import { csvCell, downloadPeerFile, fieldClass, peerApi, secondaryClass } from './shared';

export function PeerReportPanel({ periods }: { periods: PeerPeriod[] }) {
  const [periodId, setPeriodId] = useState(periods.find((period) => period.status === 'OPEN')?.id || periods[0]?.id || '');
  const [report, setReport] = useState<PeerReport | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!periodId) return; setLoading(true); peerApi<PeerReport>(`/api/admin/colegas/relatorio?periodId=${encodeURIComponent(periodId)}`).then(setReport).catch((error) => toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os resultados.')).finally(() => setLoading(false)); }, [periodId]);
  function download() {
    if (!report) return;
    const header = ['Colega', 'Setor', 'Respostas', 'Média', ...report.criteria.map((criterion) => criterion.name)];
    const rows = report.rows.map((row) => row.scores ? [row.coworkerName, row.departmentName, row.count, row.average ?? '', ...report.criteria.map((criterion) => row.scores?.[criterion.id] ?? '')] : [row.coworkerName, row.departmentName, 'Protegido', 'Protegido', ...report.criteria.map(() => 'Protegido')]);
    downloadPeerFile('resultado-colegas.csv', [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  return <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><label className="min-w-64 text-sm font-medium">Período<select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className={`${fieldClass} mt-1`}>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label><button onClick={download} disabled={!report?.rows.some((row) => row.scores)} className={secondaryClass}><Download className="mr-2 inline h-4 w-4" />Baixar consolidado</button></div>
    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm text-orange-950"><ShieldCheck className="mr-2 inline h-4 w-4" />Notas, quantidades e comentários só aparecem depois de {report?.minimum || 'o mínimo de'} respostas para a pessoa avaliada.</div>
    {loading ? <p className="p-10 text-center text-sm text-slate-500">Carregando resultados...</p> : <div className="space-y-4">{report?.rows.map((row) => <article key={row.coworkerId} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{row.coworkerName}</h3><p className="text-sm text-slate-500">{row.departmentName}</p></div>{row.scores ? <div className="text-right"><p className="text-2xl font-bold">{row.average?.toFixed(2)}</p><p className="text-xs text-slate-500">{row.count} respostas</p></div> : <span className="text-sm text-slate-500">Aguardando mínimo</span>}</div>{row.scores && <><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{report.criteria.map((criterion) => <div key={criterion.id} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{criterion.name}</dt><dd className="mt-1 font-semibold">{row.scores?.[criterion.id]?.toFixed(2) ?? '—'}</dd></div>)}</dl>{row.comments.length > 0 && <div className="mt-5"><h4 className="text-sm font-semibold">Comentários</h4><ul className="mt-2 divide-y rounded-lg border">{row.comments.map((comment, index) => <li key={index} className="whitespace-pre-wrap p-3 text-sm leading-6">{comment}</li>)}</ul></div>}</>}</article>)}{report && !report.rows.length && <p className="p-10 text-center text-sm text-slate-500">Ainda não há avaliações entre colegas neste período.</p>}</div>}
  </section>;
}
