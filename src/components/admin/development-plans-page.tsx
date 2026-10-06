'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Subject = { id: string; name: string; departmentName?: string; active: boolean };
type Status = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type Plan = { id: string; title: string; scope: 'LEADERSHIP' | 'DEPARTMENT'; subjectId: string; subjectName: string; area: string; action: string; notes?: string; owner: string; dueDate: string; status: Status };
type PlanForm = Omit<Plan, 'id' | 'subjectName'>;
const empty: PlanForm = { title: '', scope: 'LEADERSHIP', subjectId: '', area: '', action: '', notes: '', owner: 'RH/DP', dueDate: '', status: 'PLANNED' };
const statusLabels: Record<Status, string> = { PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };

export function DevelopmentPlansPage({ leaderships, departments }: { leaderships: Subject[]; departments: Subject[] }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm>(empty);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const subjects = form.scope === 'LEADERSHIP' ? leaderships : departments;
  const ordered = useMemo(() => [...plans].sort((left, right) => rank(left.status) - rank(right.status) || left.dueDate.localeCompare(right.dueDate)), [plans]);

  async function load() {
    try { const response = await fetch('/api/admin/planos', { cache: 'no-store' }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error); setPlans(result.data); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os planos.'); }
  }
  useEffect(() => { void load(); }, []);

  function start(plan?: Plan) {
    setEditing(plan || null);
    setForm(plan ? { title: plan.title, scope: plan.scope, subjectId: plan.subjectId, area: plan.area, action: plan.action, notes: plan.notes || '', owner: plan.owner, dueDate: plan.dueDate.slice(0, 10), status: plan.status } : empty);
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      const response = await fetch(editing ? `/api/admin/planos/${editing.id}` : '/api/admin/planos', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error);
      toast.success(editing ? 'Plano atualizado.' : 'Plano criado.'); setOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o plano.'); }
    finally { setBusy(false); }
  }

  async function updateStatus(plan: Plan, status: Status) {
    try { const response = await fetch(`/api/admin/planos/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error); toast.success('Situação atualizada.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar.'); }
  }

  async function remove(plan: Plan) {
    if (!window.confirm(`Excluir o plano “${plan.title}”?`)) return;
    try { const response = await fetch(`/api/admin/planos/${plan.id}`, { method: 'DELETE' }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error); toast.success('Plano excluído.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.'); }
  }

  const overdue = plans.filter((plan) => ['PLANNED', 'IN_PROGRESS'].includes(plan.status) && new Date(`${plan.dueDate.slice(0, 10)}T23:59:59`) < new Date()).length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-orange-600">Resultados → ação → acompanhamento</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Planos de desenvolvimento</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Registre ações ligadas a uma liderança ou setor, com responsável, prazo, situação e observações.</p></div><button onClick={() => start()} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />Nova ação</button></header>
    <section className="grid gap-3 sm:grid-cols-4"><Metric label="Planejados" value={plans.filter((plan) => plan.status === 'PLANNED').length} /><Metric label="Em andamento" value={plans.filter((plan) => plan.status === 'IN_PROGRESS').length} /><Metric label="Concluídos" value={plans.filter((plan) => plan.status === 'COMPLETED').length} /><Metric label="Atrasados" value={overdue} alert={overdue > 0} /></section>

    {open && <form onSubmit={save} className="space-y-4 rounded-xl border border-orange-200 bg-white p-5"><h2 className="font-semibold">{editing ? 'Editar plano de ação' : 'Novo plano de ação'}</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Título"><input required minLength={3} maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input" placeholder="Ex.: Melhorar comunicação da liderança" /></Field><Field label="Área/Critério relacionado"><input required maxLength={120} value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} className="input" placeholder="Ex.: Comunicação" /></Field><Field label="Associar a"><select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as typeof form.scope, subjectId: '' })} className="input"><option value="LEADERSHIP">Liderança</option><option value="DEPARTMENT">Setor</option></select></Field><Field label={form.scope === 'LEADERSHIP' ? 'Liderança' : 'Setor'}><select required value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="input"><option value="">Selecione</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.departmentName ? ` · ${item.departmentName}` : ''}{item.active ? '' : ' (inativo)'}</option>)}</select></Field><Field label="Responsável"><input required maxLength={120} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} className="input" /></Field><Field label="Prazo"><input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="input" /></Field><Field label="Situação"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className="input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><Field label="Descrição da ação"><textarea required minLength={5} maxLength={1000} rows={4} value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })} className="input" placeholder="Descreva o que será feito e o resultado esperado." /></Field><Field label="Observações"><textarea maxLength={2000} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input" placeholder="Registre acompanhamentos, decisões ou impedimentos." /></Field><div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar plano'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button></div></form>}

    <section className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Plano</th><th className="p-4">Destino</th><th className="p-4">Responsável</th><th className="p-4">Prazo</th><th className="p-4">Situação</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y">{ordered.map((plan) => { const isOverdue = ['PLANNED', 'IN_PROGRESS'].includes(plan.status) && new Date(`${plan.dueDate.slice(0, 10)}T23:59:59`) < new Date(); return <tr key={plan.id}><td className="max-w-md p-4"><p className="font-semibold">{plan.title}</p><p className="mt-1 text-xs font-medium text-orange-700">{plan.area}</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{plan.action}</p>{plan.notes && <p className="mt-2 text-xs text-slate-500">Observações: {plan.notes}</p>}</td><td className="p-4"><p className="font-medium">{plan.subjectName}</p><p className="text-xs text-slate-500">{plan.scope === 'LEADERSHIP' ? 'Liderança' : 'Setor'}</p></td><td className="p-4">{plan.owner}</td><td className={`p-4 ${isOverdue ? 'font-semibold text-red-700' : ''}`}>{new Date(plan.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{isOverdue && <span className="mt-1 flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Atrasado</span>}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(plan.status)}`}>{statusLabels[plan.status]}</span></td><td className="p-4"><div className="flex justify-end gap-2">{plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && <button onClick={() => void updateStatus(plan, 'COMPLETED')} title="Marcar como concluído" className="rounded-lg border p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></button>}<button onClick={() => start(plan)} title="Editar" className="rounded-lg border p-2"><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(plan)} title="Excluir" className="rounded-lg border border-red-200 p-2 text-red-700"><Trash2 className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div>{!plans.length && <div className="p-12 text-center text-sm text-slate-500"><ClipboardList className="mx-auto mb-3 h-9 w-9 text-slate-300" />Nenhuma ação cadastrada. Crie a primeira a partir de um resultado de avaliação.</div>}</section>
  </div>;
}

const rank = (status: Status) => status === 'IN_PROGRESS' ? 0 : status === 'PLANNED' ? 1 : status === 'COMPLETED' ? 2 : 3;
const statusClass = (status: Status) => status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' : status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800';
function Metric({ label, value, alert }: { label: string; value: number; alert?: boolean }) { return <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-700' : ''}`}>{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-700">{label}<span className="mt-1 block [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-slate-300 [&_.input]:bg-white [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm">{children}</span></label>; }
