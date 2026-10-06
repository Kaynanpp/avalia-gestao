'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, KeyRound, Search, ShieldCheck, UserRound } from 'lucide-react';
import type { Coworker, PeerAccessContext, PublicPeerContext } from '@/lib/peer/types';
import { PeerEvaluationForm } from './evaluation-form';

const PAGE_SIZE = 24;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function PublicPeerDirectoryForm({ context }: { context: PublicPeerContext & { period: { id: string; name: string } } }) {
  const [registration, setRegistration] = useState('');
  const [access, setAccess] = useState<PeerAccessContext | null>(null);
  const [accessError, setAccessError] = useState('');
  const [accessing, setAccessing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Coworker | null>(null);

  async function identify(event: React.FormEvent) {
    event.preventDefault();
    if (accessing) return;
    setAccessing(true); setAccessError('');
    try {
      const response = await fetch('/api/avaliacoes-colegas/acesso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registration }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível validar a matrícula.');
      setAccess(result.data); setRegistration(''); setSearch(''); setPage(1);
    } catch (error) { setAccessError(error instanceof Error ? error.message : 'Não foi possível validar a matrícula.'); }
    finally { setAccessing(false); }
  }

  const people = useMemo(() => {
    const query = normalize(search.trim());
    return (access?.coworkers || []).filter((person) => !query || normalize(`${person.name} ${person.position}`).includes(query));
  }, [access, search]);
  const pageCount = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePeople = people.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!access) return <section className="mx-auto max-w-xl space-y-6">
    <header><p className="ui-eyebrow">{context.period.name}</p><h1 className="ui-title">Identifique sua participação</h1><p className="ui-description">Informe sua matrícula para visualizar somente os colegas do seu setor. Não é necessário criar conta ou senha.</p></header>
    <form onSubmit={identify} className="ui-card space-y-4 p-5 sm:p-6"><label htmlFor="peer-registration" className="ui-label">Matrícula<span className="relative mt-1 block"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input id="peer-registration" required autoComplete="off" maxLength={40} value={registration} onChange={(event) => setRegistration(event.target.value)} className="ui-input pl-11 text-base" placeholder="Digite sua matrícula" /></span></label>{accessError && <p role="alert" className="ui-alert-error">{accessError}</p>}<button disabled={accessing} className="ui-button-primary w-full py-3">{accessing ? 'Validando matrícula...' : 'Continuar'}</button></form>
    <div className="ui-alert-success"><ShieldCheck className="mr-2 inline h-4 w-4" />O RH acompanha a participação total, mas não relaciona sua identidade a uma nota ou comentário específico.</div>
  </section>;

  if (selected) return <PeerEvaluationForm coworkerId={selected.id} periodId={access.period.id} participationToken={access.participationToken} coworkerName={selected.name} departmentName={selected.departmentName} periodName={access.period.name} commentsEnabled={access.commentsEnabled} criteria={access.criteria} onBack={() => setSelected(null)} onEvaluateAnother={() => { setSelected(null); setSearch(''); setPage(1); }} />;

  return <section className="space-y-6">
    <header className="ui-page-header"><div><p className="ui-eyebrow">{access.period.name}</p><h1 className="ui-title">Quem você deseja avaliar?</h1><p className="ui-description">Olá, {access.evaluatorName}. Escolha uma pessoa do setor {access.departmentName}.</p></div><button type="button" onClick={() => { setAccess(null); setSelected(null); }} className="ui-button-secondary">Trocar matrícula</button></header>
    <label className="ui-label">Buscar por nome ou cargo<span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Digite o nome" className="ui-input pl-9" /></span></label>
    <p className="text-xs text-slate-500" aria-live="polite">{people.length} colegas disponíveis no seu setor</p>
    <div className="grid gap-3 sm:grid-cols-2">{visiblePeople.map((person) => <button key={person.id} type="button" onClick={() => setSelected(person)} className="ui-card flex min-h-20 items-center gap-3 p-4 text-left transition-colors hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"><UserRound className="h-5 w-5" /></span><span className="min-w-0"><span className="block truncate font-semibold text-slate-900 dark:text-white">{person.name}</span><span className="block truncate text-sm text-slate-500 dark:text-slate-400">{person.position || person.departmentName}</span></span><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" /></button>)}</div>
    {!visiblePeople.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Nenhum outro colega ativo foi encontrado no seu setor.</p>}
    {pageCount > 1 && <nav aria-label="Páginas de colegas" className="flex items-center justify-between rounded-xl border bg-white p-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button><span className="text-xs text-slate-500">Página {currentPage} de {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Próxima<ChevronRight className="h-4 w-4" /></button></nav>}
    <p className="ui-alert-info text-xs">Cada colega pode ser avaliado uma vez por você em cada ciclo. O comentário será lido pelo RH/DP sem sua identificação.</p>
  </section>;
}
