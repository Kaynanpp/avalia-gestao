'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Coworker, PeerDepartment, PeerPeriod } from '@/lib/peer/types';
import { PeerImportPanel } from './import-panel';
import { PeerParticipationPanel } from './participation-panel';
import { PeerReportPanel } from './report-panel';
import { buttonClass, fieldClass, peerApi, secondaryClass } from './shared';

type ManagementData = { coworkers: Coworker[]; departments: PeerDepartment[]; periods: PeerPeriod[] };
type Tab = 'people' | 'import' | 'participation' | 'report';
const tabs: Array<{ id: Tab; name: string }> = [
  { id: 'people', name: 'Colaboradores' },
  { id: 'import', name: 'Importar colaboradores' },
  { id: 'participation', name: 'Participação' },
  { id: 'report', name: 'Resultados e comentários' },
];

export function PeerManagementPage() {
  const [data, setData] = useState<ManagementData>({ coworkers: [], departments: [], periods: [] });
  const [tab, setTab] = useState<Tab>('people');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Coworker | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', registration: '', position: '', departmentId: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { setData(await peerApi<ManagementData>('/api/admin/colegas')); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os cadastros.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, departmentId, status]);
  const activeDepartments = data.departments.filter((department) => department.active);
  const people = useMemo(() => {
    const query = search.toLocaleLowerCase('pt-BR');
    return data.coworkers.filter((person) =>
      (!departmentId || person.departmentId === departmentId) &&
      (status === 'all' || person.active === (status === 'active')) &&
      `${person.name} ${person.registration} ${person.position} ${person.departmentName}`.toLocaleLowerCase('pt-BR').includes(query)
    );
  }, [data.coworkers, departmentId, status, search]);
  const pageCount = Math.max(1, Math.ceil(people.length / 20));
  const currentPage = Math.min(page, pageCount);

  function openForm(person: Coworker | null = null) {
    setEditing(person);
    setForm({
      name: person?.name || '', registration: person?.registration || '', position: person?.position || '',
      departmentId: person?.departmentId || activeDepartments[0]?.id || '',
    });
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!form.departmentId) throw new Error('Selecione um setor.');
      if (!editing && !form.registration.trim()) throw new Error('Informe a matrícula.');
      await peerApi(`/api/admin/colegas${editing ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', {
        name: form.name.trim(), registration: form.registration.trim(), position: form.position.trim(),
        departmentId: form.departmentId, active: editing?.active ?? true,
      });
      toast.success(editing ? 'Cadastro atualizado.' : 'Colaborador cadastrado e disponível para avaliação.');
      setFormOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }

  async function toggle(person: Coworker) {
    if (person.active && !window.confirm(`Desativar ${person.name}? A pessoa deixará de acessar e aparecer na avaliação. O histórico será preservado.`)) return;
    setBusy(true);
    try {
      await peerApi(`/api/admin/colegas/${person.id}`, 'PATCH', {
        name: person.name, registration: person.registration, position: person.position,
        departmentId: person.departmentId, active: !person.active,
      });
      toast.success(person.active ? 'Colaborador desativado.' : 'Colaborador reativado.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível alterar.'); }
    finally { setBusy(false); }
  }

  async function remove(person: Coworker) {
    if (!window.confirm(`Excluir o cadastro de ${person.name}? A exclusão só é permitida quando não há avaliações. Para desligamentos, prefira desativar.`)) return;
    setBusy(true);
    try { await peerApi(`/api/admin/colegas/${person.id}`, 'DELETE', {}); toast.success('Cadastro excluído.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-orange-600">Pessoas e participação</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Colaboradores</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Mantenha os dados por setor, importe listas e acompanhe a participação sem relacionar pessoas às notas ou comentários.</p></div><button onClick={() => void load()} disabled={loading || busy} className={secondaryClass}><RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button></header>

    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Colaboradores cadastrados" value={data.coworkers.length} /><Metric label="Colaboradores ativos" value={data.coworkers.filter((person) => person.active).length} accent="emerald" /><Metric label="Matrículas pendentes" value={data.coworkers.filter((person) => !person.registration).length} accent="amber" /></section>

    <nav aria-label="Opções de colaboradores" className="flex flex-wrap gap-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item.id ? 'bg-orange-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{item.name}</button>)}</nav>
    {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</div>}

    {tab === 'people' && <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Cadastro de colaboradores</h2><p className="text-sm text-slate-500">A matrícula identifica somente a participação e nunca é gravada na resposta.</p></div><button onClick={() => openForm()} disabled={!activeDepartments.length || busy || loading} className={buttonClass}><UserPlus className="mr-2 inline h-4 w-4" />Adicionar colaborador</button></div>
      {!activeDepartments.length && !loading && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Cadastre ou ative um setor antes de adicionar colaboradores.</p>}
      {formOpen && <form onSubmit={save} className="space-y-4 rounded-xl border border-orange-200 bg-white p-5"><h3 className="font-semibold text-slate-900">{editing ? 'Editar colaborador' : 'Novo colaborador'}</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></Field><Field label="Matrícula"><input required={!editing} maxLength={40} value={form.registration} onChange={(event) => setForm({ ...form, registration: event.target.value })} className={fieldClass} placeholder="Ex.: 00125" /></Field><Field label="Setor"><select required value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} className={fieldClass}>{data.departments.filter((department) => department.active || department.id === editing?.departmentId).map((department) => <option key={department.id} value={department.id}>{department.name}{department.active ? '' : ' (inativo)'}</option>)}</select></Field><Field label="Cargo/Função"><input required={!editing} maxLength={120} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} className={fieldClass} placeholder="Ex.: Auxiliar de produção" /></Field></div>{editing && <p className="text-xs leading-5 text-amber-800">Alterações não modificam avaliações históricas. Cadastros antigos sem matrícula precisam ser completados para participar.</p>}<div className="flex gap-2"><button disabled={busy} className={buttonClass}>{busy ? 'Salvando...' : 'Salvar cadastro'}</button><button type="button" onClick={() => setFormOpen(false)} disabled={busy} className={secondaryClass}>Cancelar</button></div></form>}

      <div className="grid gap-3 sm:grid-cols-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar colaborador" placeholder="Nome, matrícula ou cargo" className={`${fieldClass} pl-9`} /></div><select aria-label="Filtrar por setor" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className={fieldClass}><option value="">Todos os setores</option>{data.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select aria-label="Filtrar por situação" value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}><option value="all">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Matrícula</th><th className="px-5 py-3">Setor</th><th className="px-5 py-3">Cargo/Função</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{people.slice((currentPage - 1) * 20, currentPage * 20).map((person) => <tr key={person.id}><td className="px-5 py-4 font-medium text-slate-900">{person.name}</td><td className="px-5 py-4 font-mono text-xs">{person.registration || <span className="font-sans text-amber-700">Pendente</span>}</td><td className="px-5 py-4 text-slate-600">{person.departmentName}</td><td className="px-5 py-4 text-slate-600">{person.position || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs ${person.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{person.active ? 'Ativo' : 'Inativo'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button title={`Editar ${person.name}`} disabled={busy} onClick={() => openForm(person)} className={secondaryClass}><Pencil className="h-4 w-4" /></button><button disabled={busy} onClick={() => void toggle(person)} className={secondaryClass}>{person.active ? 'Desativar' : 'Reativar'}</button><button title={`Excluir ${person.name}`} disabled={busy} onClick={() => void remove(person)} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>{!people.length && <div className="p-10 text-center text-sm text-slate-500"><Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />{loading ? 'Carregando colaboradores...' : 'Nenhum colaborador encontrado.'}</div>}<div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500"><span>{people.length} pessoas · página {currentPage} de {pageCount}</span><div className="flex gap-2"><button className={secondaryClass} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><button className={secondaryClass} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</button></div></div></div>
    </section>}
    {tab === 'import' && <PeerImportPanel onImported={load} departments={data.departments} />}
    {tab === 'participation' && <PeerParticipationPanel periods={data.periods} />}
    {tab === 'report' && <PeerReportPanel periods={data.periods} />}
  </div>;
}

function Metric({ label, value, accent = 'slate' }: { label: string; value: number; accent?: 'slate' | 'emerald' | 'amber' }) {
  const color = accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-700">{label}<span className="mt-1 block">{children}</span></label>; }
