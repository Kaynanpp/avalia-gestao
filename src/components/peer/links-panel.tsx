'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Download, Link2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Coworker, GeneratedPeerLink, PeerDepartment, PeerLink, PeerPeriod } from '@/lib/peer/types';
import { buttonClass, csvCell, downloadPeerFile, fieldClass, peerApi, secondaryClass } from './shared';

export function PeerLinksPanel({ coworkers, periods, departments }: { coworkers: Coworker[]; periods: PeerPeriod[]; departments: PeerDepartment[] }) {
  const activePeople = coworkers.filter((person) => person.active && departments.some((department) => department.id === person.departmentId && department.active));
  const openPeriods = periods.filter((period) => period.status === 'OPEN');
  const [coworkerId, setCoworkerId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(7);
  const [links, setLinks] = useState<PeerLink[]>([]);
  const [generated, setGenerated] = useState<GeneratedPeerLink[]>([]);
  const [busy, setBusy] = useState(false);
  const grouped = useMemo(() => [...new Set(activePeople.map((person) => person.departmentName))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [activePeople]);

  async function load() {
    try { setLinks(await peerApi<PeerLink[]>('/api/admin/colegas/links')); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os links.'); }
  }
  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setGenerated([]);
    try {
      const result = await peerApi<GeneratedPeerLink[]>('/api/admin/colegas/links', 'POST', { coworkerId, periodId, count, expiresInDays: days });
      setGenerated(result); toast.success(`${result.length} ${result.length === 1 ? 'convite gerado' : 'convites gerados'}. Copie ou baixe agora.`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível gerar os convites.'); }
    finally { setBusy(false); }
  }
  async function cancel(id: string) {
    if (!window.confirm('Cancelar este convite pendente?')) return;
    try { await peerApi(`/api/admin/colegas/links/${id}`, 'DELETE', {}); toast.success('Convite cancelado.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar.'); }
  }
  const fullLink = (token: string) => `${window.location.origin}/avaliar-colega/${token}`;
  function download() {
    const rows = [['Pessoa avaliada', 'Setor', 'Período', 'Link individual'], ...generated.map((item) => [item.coworkerName, item.departmentName, item.periodName, fullLink(item.token)])];
    downloadPeerFile('convites-avaliacao-colegas.csv', rows.map((row) => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  return <section className="space-y-5">
    <div><h2 className="font-semibold text-slate-900">Convites individuais</h2><p className="mt-1 text-sm leading-6 text-slate-500">Cada link avalia uma pessoa específica e aceita uma resposta. Entregue somente a colegas do mesmo setor e não entregue o convite à própria pessoa avaliada.</p></div>
    {(!activePeople.length || !openPeriods.length) && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Para gerar convites, cadastre colegas ativos e mantenha um período aberto dentro das datas configuradas.</p>}
    <form onSubmit={create} className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-medium sm:col-span-2">Pessoa avaliada<select required value={coworkerId} onChange={(event) => setCoworkerId(event.target.value)} className={`${fieldClass} mt-1`}><option value="">Selecione</option>{grouped.map((department) => <optgroup key={department} label={department}>{activePeople.filter((person) => person.departmentName === department).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</optgroup>)}</select></label>
      <label className="text-sm font-medium">Período<select required value={periodId} onChange={(event) => setPeriodId(event.target.value)} className={`${fieldClass} mt-1`}><option value="">Selecione</option>{openPeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
      <label className="text-sm font-medium">Validade<input type="number" min={1} max={30} required value={days} onChange={(event) => setDays(Number(event.target.value))} className={`${fieldClass} mt-1`} /><span className="mt-1 block text-xs text-slate-500">dias, limitado ao fim do período</span></label>
      <label className="text-sm font-medium">Quantidade<input type="number" min={1} max={50} required value={count} onChange={(event) => setCount(Number(event.target.value))} className={`${fieldClass} mt-1`} /></label>
      <div className="flex items-end sm:col-span-2"><button disabled={busy || !activePeople.length || !openPeriods.length} className={buttonClass}><Link2 className="mr-2 inline h-4 w-4" />{busy ? 'Gerando...' : 'Gerar convites'}</button></div>
    </form>
    {generated.length > 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-emerald-950">Convites prontos</h3><p className="text-sm text-emerald-900">Eles são exibidos uma única vez. Baixe ou copie antes de sair.</p></div><button onClick={download} className={secondaryClass}><Download className="mr-2 inline h-4 w-4" />Baixar CSV</button></div><ul className="mt-4 space-y-3">{generated.map((item) => <li key={item.id} className="rounded-lg bg-white p-3"><p className="text-sm font-medium">{item.coworkerName} · {item.departmentName}</p><div className="mt-2 flex gap-2"><input readOnly value={fullLink(item.token)} onFocus={(event) => event.currentTarget.select()} className={`${fieldClass} min-w-0 font-mono text-xs`} /><button onClick={() => navigator.clipboard.writeText(fullLink(item.token)).then(() => toast.success('Link copiado.'))} className={secondaryClass} aria-label={`Copiar convite de ${item.coworkerName}`}><ClipboardCopy className="h-4 w-4" /></button></div></li>)}</ul></div>}
    <div className="overflow-hidden rounded-xl border bg-white"><div className="flex items-center justify-between border-b p-4"><h3 className="font-semibold">Últimos convites</h3><button onClick={() => void load()} className={secondaryClass}><RefreshCw className="h-4 w-4" aria-label="Atualizar" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Pessoa / setor</th><th className="p-4">Período</th><th className="p-4">Situação</th><th className="p-4">Validade</th><th className="p-4 text-right">Ação</th></tr></thead><tbody className="divide-y">{links.map((item) => <tr key={item.id}><td className="p-4"><p className="font-medium">{item.coworkerName}</p><p className="text-xs text-slate-500">{item.departmentName}</p></td><td className="p-4">{item.periodName}</td><td className="p-4">{({PENDING:'Pendente',USED:'Respondido',EXPIRED:'Expirado',INVALIDATED:'Cancelado'} as Record<string,string>)[item.status] || item.status}</td><td className="p-4 text-xs">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('pt-BR') : '—'}</td><td className="p-4 text-right">{item.status === 'PENDING' && <button onClick={() => void cancel(item.id)} className="rounded-lg border border-red-200 p-2 text-red-700"><XCircle className="h-4 w-4" /></button>}</td></tr>)}</tbody></table>{!links.length && <p className="p-8 text-center text-sm text-slate-500">Nenhum convite gerado.</p>}</div></div>
  </section>;
}
