'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, UserX, UserCheck, Users, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { LEADERSHIP_LEVEL_LABELS } from '@/types';
import type { Manager, Department, LeadershipLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '@/components/ui/product-ui';

const levels = Object.entries(LEADERSHIP_LEVEL_LABELS) as [LeadershipLevel, string][];
const emptyForm = { name: '', email: '', departmentId: '', position: '', leadershipLevel: 'MANAGER' as LeadershipLevel };
const inputClass = 'ui-input';

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(response.status === 401 ? 'Sua sessão terminou. Entre novamente para continuar.' : payload?.error || 'Não foi possível concluir a solicitação. Tente novamente.');
  }
  return payload;
}

export default function LiderancasPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<LeadershipLevel | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchManagers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (departmentFilter) query.set('departmentId', departmentFilter);
      if (levelFilter) query.set('leadershipLevel', levelFilter);
      if (debouncedSearch.trim()) query.set('search', debouncedSearch.trim());
      const data = await readResponse(await fetch(`/api/liderancas?${query}`, { signal }));
      if (signal?.aborted) return;
      setManagers(data.data);
      setPagination(data.pagination);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Erro ao carregar lideranças.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter, departmentFilter, levelFilter, debouncedSearch, page, pageSize]);

  const fetchDepartments = useCallback(async () => {
    setDepartmentError('');
    try {
      const data = await readResponse(await fetch('/api/setores'));
      setDepartments(data.data);
    } catch (error) {
      setDepartmentError(error instanceof Error ? error.message : 'Erro ao carregar setores.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchManagers(controller.signal);
    return () => controller.abort();
  }, [fetchManagers]);

  useEffect(() => { void fetchDepartments(); }, [fetchDepartments]);

  const openForm = (manager?: Manager) => {
    setEditing(manager || null);
    setFormData(manager ? {
      name: manager.name, email: manager.email || '', departmentId: manager.departmentId,
      position: manager.position, leadershipLevel: manager.leadershipLevel || 'MANAGER',
    } : emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await readResponse(await fetch(editing ? `/api/liderancas/${editing.id}` : '/api/liderancas', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      }));
      toast.success(editing ? 'Liderança atualizada.' : 'Liderança cadastrada.');
      setIsFormOpen(false);
      await fetchManagers();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a liderança.');
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (manager: Manager) => {
    if (manager.status === 'ACTIVE' && !window.confirm(`Desativar ${manager.name}? O cadastro deixará de receber avaliações. O histórico continuará disponível ao RH/DP.`)) return;
    setBusyId(manager.id);
    try {
      await readResponse(await fetch(`/api/liderancas/${manager.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: manager.status === 'ACTIVE' ? 'DEACTIVATE' : 'ACTIVATE' }),
      }));
      toast.success(manager.status === 'ACTIVE' ? 'Liderança desativada.' : 'Liderança reativada.');
      await fetchManagers();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao alterar status.'); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (manager: Manager) => {
    if (!window.confirm(`Excluir permanentemente o cadastro de ${manager.name}? Cadastros com avaliações ou links devem ser desativados para preservar o histórico.`)) return;
    setBusyId(manager.id);
    try {
      await readResponse(await fetch(`/api/liderancas/${manager.id}`, { method: 'DELETE' }));
      toast.success('Cadastro excluído.');
      await fetchManagers();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a liderança.'); }
    finally { setBusyId(null); }
  };

  const activeDepartments = departments.filter(department => department.active);
  const formDepartments = departments.filter(department => department.active || department.id === editing?.departmentId);
  const hasFilters = !!search || !!departmentFilter || !!levelFilter || statusFilter !== 'ACTIVE';
  const resetFilters = () => { setSearch(''); setDepartmentFilter(''); setLevelFilter(''); setStatusFilter('ACTIVE'); setPage(1); };

  return (
    <div className="ui-page">
      <PageHeader eyebrow="Pessoas" title="Lideranças" description="Cadastre gerentes, coordenadores, supervisores e líderes para avaliação da equipe." actions={
        <button onClick={() => openForm()} className="ui-button ui-button-primary">
          <Plus className="h-4 w-4" /> Nova liderança
        </button>
      } />

      <div className="ui-filter-bar sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="leadership-search" className="mb-1 block text-xs font-medium text-slate-600">Buscar por nome, cargo, setor ou e-mail</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input id="leadership-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} placeholder="Digite para buscar" className={cn(inputClass, 'pl-9')} />
          </div>
        </div>
        <div>
          <label htmlFor="leadership-department" className="mb-1 block text-xs font-medium text-slate-600">Setor</label>
          <select id="leadership-department" value={departmentFilter} onChange={event => { setDepartmentFilter(event.target.value); setPage(1); }} className={inputClass}>
            <option value="">Todos os setores</option>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}{!department.active ? ' (inativo)' : ''}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="leadership-level-filter" className="mb-1 block text-xs font-medium text-slate-600">Tipo de liderança</label>
          <select id="leadership-level-filter" value={levelFilter} onChange={event => { setLevelFilter(event.target.value as LeadershipLevel | ''); setPage(1); }} className={inputClass}>
            <option value="">Todos os tipos</option>
            {levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="leadership-status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select id="leadership-status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} className={inputClass}>
            <option value="ACTIVE">Ativas</option><option value="INACTIVE">Desativadas</option><option value="ALL">Todas</option>
          </select>
        </div>
        {hasFilters && <button onClick={resetFilters} className="justify-self-start text-sm font-medium text-orange-600 hover:underline">Limpar filtros</button>}
      </div>

      {departmentError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{departmentError} <button onClick={() => void fetchDepartments()} className="font-semibold underline">Recarregar setores</button></div>}

      <div className="ui-table-shell" aria-busy={loading}>
        {loading ? <LoadingState label="Carregando lideranças" /> : loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center" role="alert">
            <AlertCircle className="h-8 w-8 text-amber-600" /><p className="text-slate-700">{loadError}</p>
            <button onClick={() => void fetchManagers()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Tentar novamente</button>
          </div>
        ) : managers.length === 0 ? (
          <EmptyState icon={Users} title="Nenhuma liderança encontrada" description={hasFilters ? 'Revise os filtros para encontrar o cadastro.' : 'Cadastre as lideranças de cada setor para começar.'} />
        ) : (
          <>
            <div className="ui-table-mobile-cards overflow-x-auto">
              <table className="ui-table">
                <caption className="sr-only">Lideranças cadastradas, seus setores e ações de cadastro.</caption>
                <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-600">
                  <tr><th scope="col" className="px-5 py-4">Liderança</th><th scope="col" className="px-5 py-4">Setor</th><th scope="col" className="px-5 py-4">Cargo e tipo</th><th scope="col" className="px-5 py-4">Status</th><th scope="col" className="px-5 py-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {managers.map(manager => (
                    <tr key={manager.id} className="hover:bg-slate-50/50">
                      <td data-label="Liderança" className="px-5 py-4"><div className="font-medium text-slate-900">{manager.name}</div><div className="mt-1 text-xs text-slate-500">{manager.email || 'Sem e-mail cadastrado'}</div></td>
                      <td data-label="Setor" className="px-5 py-4 text-slate-600">{manager.departmentName || departments.find(department => department.id === manager.departmentId)?.name || 'Setor indisponível'}</td>
                      <td data-label="Cargo e tipo" className="px-5 py-4"><div className="text-slate-700">{manager.position}</div><div className="mt-1 text-xs text-slate-500">{LEADERSHIP_LEVEL_LABELS[manager.leadershipLevel || 'MANAGER']}</div></td>
                      <td data-label="Status" className="px-5 py-4"><StatusBadge tone={manager.status === 'ACTIVE' ? 'success' : 'neutral'}>{manager.status === 'ACTIVE' ? 'Ativa' : 'Desativada'}</StatusBadge></td>
                      <td data-label="Ações" className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openForm(manager)} disabled={!!busyId} className="rounded-md p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-50" title="Editar cadastro" aria-label={`Editar ${manager.name}`}><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => void handleStatusChange(manager)} disabled={!!busyId} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50" title={manager.status === 'ACTIVE' ? 'Desativar' : 'Reativar'} aria-label={`${manager.status === 'ACTIVE' ? 'Desativar' : 'Reativar'} ${manager.name}`}>{manager.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button>
                          <button onClick={() => void handleDelete(manager)} disabled={!!busyId} className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-50" title="Excluir cadastro sem histórico" aria-label={`Excluir ${manager.name}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
              <p role="status">{(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} lideranças</p>
              <div className="flex items-center gap-2">
                <label htmlFor="leadership-page-size" className="sr-only">Cadastros por página</label>
                <select id="leadership-page-size" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-md border bg-white px-2 py-1.5"><option value={25}>25 por página</option><option value={50}>50 por página</option><option value={100}>100 por página</option></select>
                <button onClick={() => setPage(pagination.page - 1)} disabled={pagination.page <= 1} className="rounded-md border p-1.5 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
                <span>{pagination.page} / {pagination.totalPages}</span>
                <button onClick={() => setPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="rounded-md border p-1.5 disabled:opacity-40" aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">Desative cadastros de pessoas desligadas para preservar as avaliações nos relatórios. A exclusão é permitida para cadastros sem histórico.</p>

      <Dialog open={isFormOpen} onOpenChange={open => { if (!submitting) setIsFormOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle>{editing ? 'Editar liderança' : 'Cadastrar liderança'}</DialogTitle><DialogDescription>Informe o setor e o tipo de liderança. O e-mail é opcional e este cadastro não cria uma conta de acesso.</DialogDescription></DialogHeader>
            <fieldset disabled={submitting} className="grid gap-4 py-5">
              <div className="space-y-1"><label htmlFor="leadership-name" className="text-sm font-medium">Nome completo</label><input id="leadership-name" required minLength={2} maxLength={100} value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} className={inputClass} autoComplete="name" /></div>
              <div className="space-y-1"><label htmlFor="leadership-email" className="text-sm font-medium">E-mail <span className="font-normal text-slate-500">(opcional)</span></label><input id="leadership-email" type="email" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })} className={inputClass} autoComplete="email" /></div>
              <div className="space-y-1"><label htmlFor="leadership-form-department" className="text-sm font-medium">Setor</label><select id="leadership-form-department" required value={formData.departmentId} onChange={event => setFormData({ ...formData, departmentId: event.target.value })} className={inputClass}><option value="">Selecione um setor</option>{formDepartments.map(department => <option key={department.id} value={department.id}>{department.name}{!department.active ? ' (inativo)' : ''}</option>)}</select>
                {activeDepartments.length === 0 && !editing && <p className="text-xs text-amber-700">Cadastre um setor ativo em <Link href="/admin/setores" className="underline">Setores</Link> antes de adicionar uma liderança.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><label htmlFor="leadership-form-level" className="text-sm font-medium">Tipo de liderança</label><select id="leadership-form-level" value={formData.leadershipLevel} onChange={event => setFormData({ ...formData, leadershipLevel: event.target.value as LeadershipLevel })} className={inputClass}>{levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="space-y-1"><label htmlFor="leadership-position" className="text-sm font-medium">Cargo</label><input id="leadership-position" required minLength={2} maxLength={100} value={formData.position} onChange={event => setFormData({ ...formData, position: event.target.value })} placeholder="Líder de produção" className={inputClass} /></div>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            </fieldset>
            <DialogFooter><button type="button" onClick={() => setIsFormOpen(false)} disabled={submitting} className="ui-button ui-button-secondary">Cancelar</button><button type="submit" disabled={submitting || !!departmentError || formDepartments.length === 0} className="ui-button ui-button-primary">{submitting ? 'Salvando...' : 'Salvar liderança'}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
