'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Edit2, Play, Plus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateInput } from '@/lib/utils';
import type { EvaluationModality, EvaluationPeriod } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const status = {
  DRAFT: { label: 'Planejado', style: 'bg-slate-100 text-slate-700 ring-slate-200' },
  OPEN: { label: 'Aberto', style: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  CLOSED: { label: 'Encerrado', style: 'bg-red-100 text-red-800 ring-red-200' },
};
const empty = { name: '', description: '', startDate: '', endDate: '', modalities: ['LEADERSHIP', 'PEER'] as EvaluationModality[] };

export default function PeriodosPage() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EvaluationPeriod | null>(null);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch('/api/periodos', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setPeriods(result.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao carregar períodos.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function start(period?: EvaluationPeriod) {
    setEditing(period || null);
    setForm(period ? {
      name: period.name, description: period.description || '',
      startDate: formatDateInput(period.startDate), endDate: formatDateInput(period.endDate),
      modalities: period.modalities?.length ? period.modalities : ['LEADERSHIP', 'PEER'],
    } : empty);
    setOpen(true);
  }

  function toggleModality(modality: EvaluationModality) {
    setForm((current) => ({ ...current, modalities: current.modalities.includes(modality) ? current.modalities.filter((item) => item !== modality) : [...current.modalities, modality] }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.modalities.length) { toast.error('Selecione ao menos uma modalidade.'); return; }
    setSubmitting(true);
    try {
      const response = await fetch(editing ? `/api/periodos/${editing.id}` : '/api/periodos', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      toast.success(editing ? 'Ciclo atualizado.' : 'Ciclo planejado.'); setOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o ciclo.'); }
    finally { setSubmitting(false); }
  }

  async function act(id: string, action: 'OPEN' | 'CLOSE') {
    const verb = action === 'OPEN' ? 'abrir' : 'encerrar';
    if (action === 'CLOSE' && !window.confirm('Encerrar este ciclo? Novas avaliações serão bloqueadas imediatamente.')) return;
    try {
      const response = await fetch(`/api/periodos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      toast.success(`Ciclo ${action === 'OPEN' ? 'aberto' : 'encerrado'}.`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : `Não foi possível ${verb} o ciclo.`); }
  }

  const active = periods.find((period) => period.status === 'OPEN');
  return <div className="ui-page">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-orange-600">Ciclos de avaliação</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Períodos</h1><p className="mt-1 text-slate-500">Planeje, abra e encerre ciclos com modalidades e volume de participação visíveis.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button onClick={() => start()} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Novo ciclo</button></DialogTrigger><DialogContent className="sm:max-w-xl"><form onSubmit={save}><DialogHeader><DialogTitle>{editing ? 'Editar ciclo' : 'Planejar novo ciclo'}</DialogTitle><DialogDescription>Defina as datas e quais avaliações estarão disponíveis.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><Field label="Nome do ciclo"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input" placeholder="Ex.: Ciclo de Avaliação — Setembro/2026" /></Field><Field label="Descrição"><textarea maxLength={300} rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Data inicial"><input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="input" /></Field><Field label="Data final"><input type="date" required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="input" /></Field></div><fieldset><legend className="text-sm font-medium text-slate-700">Modalidades habilitadas</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><Modality checked={form.modalities.includes('LEADERSHIP')} onChange={() => toggleModality('LEADERSHIP')} label="Avaliação de lideranças" /><Modality checked={form.modalities.includes('PEER')} onChange={() => toggleModality('PEER')} label="Avaliação entre colegas" /></div></fieldset></div><DialogFooter><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button disabled={submitting} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Salvando...' : 'Salvar ciclo'}</button></DialogFooter></form></DialogContent></Dialog></header>

    {active && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="ui-status ui-status-success">Ciclo ativo</span><h2 className="mt-3 text-xl font-bold text-slate-900">{active.name}</h2><p className="mt-1 text-sm text-slate-600">{formatDate(active.startDate)} até {formatDate(active.endDate)}</p></div><div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4"><SmallMetric label="Avaliações de liderança" value={active.metrics?.leadershipEvaluations || 0} /><SmallMetric label="Participantes em liderança" value={active.metrics?.leadershipParticipants || 0} /><SmallMetric label="Avaliações de colegas" value={active.metrics?.peerEvaluations || 0} /><SmallMetric label="Participantes em colegas" value={active.metrics?.peerParticipants || 0} /></div></div></section>}

    {loading ? <p className="rounded-xl border bg-white p-12 text-center text-sm text-slate-500">Carregando ciclos...</p> : periods.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-semibold">Nenhum ciclo planejado</h2><p className="mt-1 text-sm text-slate-500">Crie o primeiro período para organizar as avaliações.</p></div> : <section className="grid gap-4 xl:grid-cols-2">{periods.map((period) => <article key={period.id} className={`rounded-xl border bg-white p-5 shadow-sm ${period.status === 'OPEN' ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{period.name}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(period.startDate)} até {formatDate(period.endDate)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status[period.status].style}`}>{status[period.status].label}</span></div>{period.description && <p className="mt-3 text-sm text-slate-600">{period.description}</p>}<div className="mt-4 flex flex-wrap gap-2">{(period.modalities || ['LEADERSHIP', 'PEER']).map((modality) => <span key={modality} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">{modality === 'LEADERSHIP' ? 'Lideranças' : 'Colegas'}</span>)}</div><dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-center sm:grid-cols-4"><div><dt className="text-[11px] text-slate-500">Avaliações de liderança</dt><dd className="mt-1 font-bold">{period.metrics?.leadershipEvaluations || 0}</dd></div><div><dt className="text-[11px] text-slate-500">Participantes em liderança</dt><dd className="mt-1 font-bold">{period.metrics?.leadershipParticipants || 0}</dd></div><div><dt className="text-[11px] text-slate-500">Avaliações de colegas</dt><dd className="mt-1 font-bold">{period.metrics?.peerEvaluations || 0}</dd></div><div><dt className="text-[11px] text-slate-500">Participantes em colegas</dt><dd className="mt-1 font-bold">{period.metrics?.peerParticipants || 0}</dd></div></dl><div className="mt-4 flex flex-wrap justify-end gap-2">{period.status === 'DRAFT' && <button onClick={() => void act(period.id, 'OPEN')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Play className="h-4 w-4" />Abrir ciclo</button>}{period.status === 'OPEN' && <button onClick={() => void act(period.id, 'CLOSE')} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"><Square className="h-4 w-4" />Encerrar ciclo</button>}{period.status !== 'CLOSED' && <button onClick={() => start(period)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"><Edit2 className="h-4 w-4" />Editar</button>}</div></article>)}</section>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="ui-label">{label}<span className="mt-1 block [&_.input]:min-h-11 [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-slate-300 [&_.input]:bg-white [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm [&_.input]:outline-none [&_.input]:focus:border-orange-500 [&_.input]:focus:ring-2 [&_.input]:focus:ring-orange-100">{children}</span></label>; }
function Modality({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) { return <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${checked ? 'border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200' : 'border-slate-200 dark:border-slate-700'}`}><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-orange-600" />{label}</label>; }
function SmallMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-900 dark:bg-slate-900"><p className="text-xl font-bold text-slate-900">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>; }
